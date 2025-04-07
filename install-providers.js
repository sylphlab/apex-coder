/**
 * Script to install additional Vercel AI SDK providers
 * 
 * Run this script with:
 * node install-providers.js
 * 
 * Or with specific providers:
 * node install-providers.js --providers=cohere,mistral,groq
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define all available providers
const ALL_PROVIDERS = [
  // Core providers (already in package.json)
  // '@ai-sdk/google',
  // '@ai-sdk/openai',
  // '@ai-sdk/anthropic',
  // '@ai-sdk/deepseek',
  // 'ollama-ai-provider',
  
  // Cloud providers
  '@ai-sdk/google-vertex',
  '@ai-sdk/cohere',
  '@ai-sdk/mistral',
  '@ai-sdk/perplexity',
  '@ai-sdk/replicate',
  '@ai-sdk/fireworks',
  '@ai-sdk/togetherai',
  '@ai-sdk/deepinfra',
  '@ai-sdk/huggingface',
  '@ai-sdk/anyscale',
  
  // Enterprise providers
  '@ai-sdk/amazon-bedrock',
  '@ai-sdk/azure',
  '@ai-sdk/groq',
];

// Define provider aliases for command line arguments
const PROVIDER_ALIASES = {
  'together': '@ai-sdk/togetherai',
  'aws': '@ai-sdk/amazon-bedrock',
  'bedrock': '@ai-sdk/amazon-bedrock',
  'vertex': '@ai-sdk/google-vertex',
  'vertexai': '@ai-sdk/google-vertex',
  'deepinfra': '@ai-sdk/deepinfra',
};

// Parse command line arguments
const args = process.argv.slice(2);
let selectedProviders = ALL_PROVIDERS;

// Check if specific providers were requested
const providersArg = args.find(arg => arg.startsWith('--providers='));
if (providersArg) {
  const requestedProviders = providersArg.split('=')[1].split(',');
  selectedProviders = requestedProviders.map(p => {
    // Check if it's a known alias
    if (PROVIDER_ALIASES[p]) {
      return PROVIDER_ALIASES[p];
    }
    // Special case for ollama
    if (p === 'ollama') {
      return 'ollama-ai-provider';
    }
    // Add @ai-sdk/ prefix if not already present
    if (!p.startsWith('@ai-sdk/')) {
      return `@ai-sdk/${p}`;
    }
    return p;
  });
}

// Check if the --all flag is present
const installAll = args.includes('--all') || !providersArg;

if (installAll) {
  console.log('Installing all Vercel AI SDK providers...');
  selectedProviders = ALL_PROVIDERS;
} else {
  console.log(`Installing selected providers: ${selectedProviders.join(', ')}`);
}

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found in the current directory.');
  process.exit(1);
}

// Read package.json to check existing dependencies
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const existingDeps = Object.keys(packageJson.dependencies || {});

// Filter out already installed providers
const providersToInstall = selectedProviders.filter(provider => !existingDeps.includes(provider));

if (providersToInstall.length === 0) {
  console.log('All selected providers are already installed.');
  process.exit(0);
}

// Install the providers
try {
  console.log(`Installing ${providersToInstall.length} providers...`);
  const command = `pnpm add ${providersToInstall.join(' ')}`;
  console.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log('Installation completed successfully!');
} catch (error) {
  console.error('Error installing providers:', error.message);
  process.exit(1);
}