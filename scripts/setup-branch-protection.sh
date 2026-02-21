#!/usr/bin/env bash
# Setup branch protection rules for main and staging branches.
# Requires: gh CLI authenticated (https://cli.github.com/)
#
# Usage: ./scripts/setup-branch-protection.sh

set -euo pipefail

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
echo "Setting up branch protection for: $REPO"

for BRANCH in main staging; do
  echo ""
  echo "=== Configuring branch: $BRANCH ==="

  gh api --method PUT "repos/${REPO}/branches/${BRANCH}/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI OK"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

  echo "Branch protection set for: $BRANCH"
done

echo ""
echo "Done! Branch protection rules:"
echo "  - Require 'CI OK' status check to pass before merge"
echo "  - Stale reviews dismissed on new pushes"
echo "  - No force pushes allowed"
echo "  - No branch deletion allowed"
echo ""
echo "To also require PR reviews, re-run with:"
echo "  required_approving_review_count: 1"
