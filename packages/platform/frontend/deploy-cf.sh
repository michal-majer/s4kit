#!/usr/bin/env bash
# Cloud Foundry deployment script for S4Kit Frontend
# Builds with npm (not bun) for Node.js-compatible module structure
# Usage: ./deploy-cf.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/.cf-deploy"

# Configuration
APP_NAME="s4kit-frontend"
API_URL="${NEXT_PUBLIC_API_URL:-https://api.s4kit.com}"
ROUTE="app.s4kit.com"

echo "==> Setting up isolated build environment"
BUILD_TMP="/tmp/s4kit-frontend-build-$$"
rm -rf "$BUILD_TMP"
mkdir -p "$BUILD_TMP"

# Copy frontend source to temp dir (outside monorepo to avoid workspace resolution)
echo "==> Copying frontend source files"
rsync -a --exclude='node_modules' --exclude='.next' --exclude='.cf-deploy' "$SCRIPT_DIR/" "$BUILD_TMP/"

# Create package.json without workspace:* references
cd "$BUILD_TMP"
node -e "
const fs = require('fs');
const pkgPath = '${BUILD_TMP}/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
// Only remove the workspace reference, keep other devDeps for build
if (pkg.devDependencies) {
  delete pkg.devDependencies['@s4kit/shared'];
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
"

echo "==> Installing dependencies with npm (for Node.js-compatible modules)"
npm install --include=dev --legacy-peer-deps 2>&1 | tail -20

echo "==> Building frontend with API_URL=$API_URL"
NEXT_PUBLIC_API_URL="$API_URL" npm run build

echo "==> Preparing deployment directory"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Find the actual standalone app location (Next.js preserves the build path)
STANDALONE_APP=$(find "$BUILD_TMP/.next/standalone" -name "server.js" -path "*/tmp/*" | head -1 | xargs dirname)

if [[ -z "$STANDALONE_APP" ]]; then
  # No nested path, server.js is at root
  STANDALONE_APP="$BUILD_TMP/.next/standalone"
fi

echo "==> Found standalone app at: $STANDALONE_APP"

# Copy server.js, node_modules, and .next to root
cp "$STANDALONE_APP/server.js" "$DEPLOY_DIR/"
cp -r "$STANDALONE_APP/node_modules" "$DEPLOY_DIR/"
cp -r "$STANDALONE_APP/.next" "$DEPLOY_DIR/"

# Copy static files
mkdir -p "$DEPLOY_DIR/.next/static"
cp -r "$BUILD_TMP/.next/static/"* "$DEPLOY_DIR/.next/static/"

# Copy public folder
if [[ -d "$BUILD_TMP/public" ]]; then
  mkdir -p "$DEPLOY_DIR/public"
  cp -r "$BUILD_TMP/public/"* "$DEPLOY_DIR/public/"
fi

# Clean up temp build dir
rm -rf "$BUILD_TMP"

# Create manifest for nodejs_buildpack
cat > "$DEPLOY_DIR/manifest.yml" << EOF
---
applications:
  - name: $APP_NAME
    memory: 256M
    instances: 1
    disk_quota: 1G

    buildpacks:
      - nodejs_buildpack

    command: node server.js

    health-check-type: http
    health-check-http-endpoint: /

    env:
      NODE_ENV: production
      HOSTNAME: 0.0.0.0

    routes:
      - route: $ROUTE
EOF

# Create package.json with deps matching what's in node_modules
# This prevents npm from removing our pre-built deps
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "s4kit-frontend",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "next": "16.0.10",
    "react": "19.2.1",
    "react-dom": "19.2.1"
  }
}
EOF

# Create .npmrc to skip scripts during npm install
cat > "$DEPLOY_DIR/.npmrc" << 'EOF'
ignore-scripts=true
EOF

# Remove sharp to avoid native module issues (it's optional for Next.js)
rm -rf "$DEPLOY_DIR/node_modules/sharp" 2>/dev/null || true
rm -rf "$DEPLOY_DIR/node_modules/@img" 2>/dev/null || true

# Create .cfignore
cat > "$DEPLOY_DIR/.cfignore" << 'EOF'
.git
*.log
EOF

echo "==> Deploying to Cloud Foundry"
cd "$DEPLOY_DIR"
cf push -f manifest.yml

echo "==> Deployment complete!"
echo "    URL: https://$ROUTE"
