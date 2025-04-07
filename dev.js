/**
 * Development script for Apex Coder
 * 
 * This script provides a convenient way to start the development environment
 * for both the extension and the webview UI.
 * 
 * Usage:
 *   node dev.js [options]
 * 
 * Options:
 *   --ui-only     Start only the webview UI development server
 *   --ext-only    Start only the extension development (watch mode)
 *   --no-browser  Don't open the browser automatically (UI-only mode)
 */

const { spawn, exec } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');
const open = require('open');

// Parse command line arguments
const args = process.argv.slice(2);
const uiOnly = args.includes('--ui-only');
const extOnly = args.includes('--ext-only');
const noBrowser = args.includes('--no-browser');

// Configuration
const UI_PORT = 5173;
const UI_URL = `http://localhost:${UI_PORT}`;
const UI_DIR = join(__dirname, 'webview-ui');
const EXT_DIR = __dirname;

// Check if required tools are installed
function checkRequirements() {
  return new Promise((resolve, reject) => {
    // Check if pnpm is installed
    exec('pnpm --version', (error) => {
      if (error) {
        console.error('❌ pnpm is not installed. Please install it with: npm install -g pnpm');
        reject(new Error('pnpm not installed'));
        return;
      }
      
      // Check if the webview-ui directory exists
      if (!existsSync(UI_DIR)) {
        console.error(`❌ Webview UI directory not found at: ${UI_DIR}`);
        reject(new Error('Webview UI directory not found'));
        return;
      }
      
      resolve();
    });
  });
}

// Start the webview UI development server
function startWebviewUI() {
  console.log('🚀 Starting Webview UI development server...');
  
  const uiProcess = spawn('pnpm', ['--filter', 'webview-ui', 'dev'], {
    cwd: EXT_DIR,
    stdio: 'inherit',
    shell: true
  });
  
  uiProcess.on('error', (error) => {
    console.error('❌ Failed to start Webview UI development server:', error);
  });
  
  return uiProcess;
}

// Start the extension in watch mode
function startExtensionWatch() {
  console.log('🔍 Starting Extension in watch mode...');
  
  const extProcess = spawn('pnpm', ['watch'], {
    cwd: EXT_DIR,
    stdio: 'inherit',
    shell: true
  });
  
  extProcess.on('error', (error) => {
    console.error('❌ Failed to start Extension watch:', error);
  });
  
  return extProcess;
}

// Open the browser with the webview UI
function openBrowser() {
  console.log(`🌐 Opening browser at ${UI_URL}`);
  
  // Wait a bit for the server to start
  setTimeout(() => {
    open(UI_URL).catch((error) => {
      console.error('❌ Failed to open browser:', error);
    });
  }, 3000);
}

// Main function
async function main() {
  try {
    await checkRequirements();
    
    let uiProcess = null;
    let extProcess = null;
    
    if (!extOnly) {
      uiProcess = startWebviewUI();
      
      if (!noBrowser) {
        openBrowser();
      }
    }
    
    if (!uiOnly) {
      extProcess = startExtensionWatch();
    }
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development environment...');
      
      if (uiProcess) {
        uiProcess.kill();
      }
      
      if (extProcess) {
        extProcess.kill();
      }
      
      process.exit(0);
    });
    
    console.log('\n🎮 Development environment started!');
    console.log('Press Ctrl+C to stop all processes.');
    
    if (!extOnly) {
      console.log(`\n📝 Webview UI: ${UI_URL}`);
    }
    
    if (!uiOnly) {
      console.log('\n🔧 To debug the extension:');
      console.log('   1. Open VS Code on this folder');
      console.log('   2. Press F5 to start debugging');
    }
    
  } catch (error) {
    console.error('❌ Failed to start development environment:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();