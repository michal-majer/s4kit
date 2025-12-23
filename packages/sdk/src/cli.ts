#!/usr/bin/env node
// ============================================================================
// S4Kit CLI - Type Generation & Utilities
// ============================================================================

const VERSION = '0.1.0';

interface CLIOptions {
  apiKey?: string;
  baseUrl?: string;
  connection?: string;
  output?: string;
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): { command: string; options: CLIOptions; positional: string[] } {
  const options: CLIOptions = {};
  const positional: string[] = [];
  let command = 'help';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === 'generate-types' || arg === 'init' || arg === 'help' || arg === 'version') {
      command = arg;
    } else if (arg === '--api-key' || arg === '-k') {
      options.apiKey = args[++i] ?? '';
    } else if (arg === '--base-url' || arg === '-u') {
      options.baseUrl = args[++i] ?? '';
    } else if (arg === '--connection' || arg === '-c') {
      options.connection = args[++i] ?? '';
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i] ?? '';
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
    } else if (arg === '--version' || arg === '-v') {
      command = 'version';
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

// ============================================================================
// Commands
// ============================================================================

function showHelp(): void {
  console.log(`
s4kit - The lightweight, type-safe SDK for SAP S/4HANA

Usage:
  s4kit <command> [options]

Commands:
  generate-types    Generate TypeScript types from SAP metadata
  init              Initialize S4Kit in your project
  help              Show this help message
  version           Show version number

Options:
  -k, --api-key     API key for S4Kit platform
  -u, --base-url    Base URL for S4Kit API (default: https://api.s4kit.com)
  -c, --connection  SAP connection alias
  -o, --output      Output directory for generated files

Examples:
  # Generate types for all entities accessible by your API key
  s4kit generate-types --api-key sk_live_xxx --output ./types

  # Generate types for a specific connection
  s4kit generate-types -k sk_live_xxx -c erp-prod -o ./types

  # Initialize S4Kit in your project
  s4kit init

Environment Variables:
  S4KIT_API_KEY     Default API key (can be overridden with --api-key)
  S4KIT_BASE_URL    Default base URL

Documentation: https://github.com/michal-majer/s4kit
`);
}

function showVersion(): void {
  console.log(`s4kit v${VERSION}`);
}

async function generateTypes(options: CLIOptions): Promise<void> {
  const apiKey = options.apiKey || process.env.S4KIT_API_KEY;
  const baseUrl = options.baseUrl || process.env.S4KIT_BASE_URL || 'https://api.s4kit.com';
  const output = options.output || './s4kit-types';

  if (!apiKey) {
    console.error('Error: API key is required');
    console.error('  Use --api-key or set S4KIT_API_KEY environment variable');
    process.exit(1);
  }

  console.log('Generating TypeScript types...');
  console.log(`  API: ${baseUrl}`);
  console.log(`  Output: ${output}`);

  try {
    // Fetch types from the platform
    const response = await fetch(`${baseUrl}/admin/types`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/typescript',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Error: Invalid API key');
        process.exit(1);
      }
      if (response.status === 404) {
        console.error('Error: Types endpoint not found. Make sure you have the correct base URL.');
        process.exit(1);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const types = await response.text();

    // Write types file
    const fs = await import('fs');
    const path = await import('path');

    const outputDir = path.resolve(output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const typesFile = path.join(outputDir, 'index.d.ts');
    fs.writeFileSync(typesFile, types);

    console.log(`\nTypes generated successfully!`);
    console.log(`  ${typesFile}`);
    console.log(`\nUsage:`);
    console.log(`  import type { A_BusinessPartner } from '${output}';`);
  } catch (error) {
    console.error('Failed to generate types:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function init(): Promise<void> {
  console.log('Initializing S4Kit...\n');

  const fs = await import('fs');

  // Check for existing config
  const configFile = 's4kit.config.ts';
  if (fs.existsSync(configFile)) {
    console.log(`Config file already exists: ${configFile}`);
    return;
  }

  // Create config file
  const config = `// S4Kit Configuration
// See: https://github.com/michal-majer/s4kit

export default {
  // Your S4Kit API key (use environment variable in production)
  apiKey: process.env.S4KIT_API_KEY || '',

  // Default SAP connection alias
  connection: 'erp-dev',

  // Optional: Base URL (default: https://api.s4kit.com)
  // baseUrl: 'https://api.s4kit.com',
};
`;

  fs.writeFileSync(configFile, config);
  console.log(`Created ${configFile}`);

  // Create types directory
  const typesDir = './s4kit-types';
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
    console.log(`Created ${typesDir}/`);
  }

  // Add to .gitignore if exists
  const gitignore = '.gitignore';
  if (fs.existsSync(gitignore)) {
    const content = fs.readFileSync(gitignore, 'utf-8');
    if (!content.includes('s4kit-types')) {
      fs.appendFileSync(gitignore, '\n# S4Kit generated types\ns4kit-types/\n');
      console.log(`Updated ${gitignore}`);
    }
  }

  console.log(`
Next steps:
  1. Set your API key in S4KIT_API_KEY environment variable
  2. Run: npx s4kit generate-types
  3. Import types in your code:
     import { S4Kit } from 's4kit';
     import type { A_BusinessPartner } from './s4kit-types';
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  switch (command) {
    case 'generate-types':
      await generateTypes(options);
      break;
    case 'init':
      await init();
      break;
    case 'version':
      showVersion();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
