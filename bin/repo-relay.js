#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

function showHelp() {
  console.log(`
repo-relay - GitHub Thread Relay & Dashboard

Usage:
  repo-relay start                Start the main relay service
  repo-relay dashboard           Start the dashboard server
  repo-relay dev                 Start in development mode with auto-reload
  repo-relay help                Show this help message

Examples:
  repo-relay start               # Start the main service
  repo-relay dashboard           # Start dashboard on http://localhost:3001

Note: Make sure to configure your .env file before starting the service.
For setup instructions, see: https://github.com/joeeddy/repo-relay
`);
}

function runCommand(script, args = []) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', script, ...args], {
    stdio: 'inherit',
    cwd: path.dirname(__dirname)
  });

  child.on('exit', (code) => {
    process.exit(code);
  });
}

const command = process.argv[2];

switch (command) {
  case 'start':
    console.log('🚀 Starting repo-relay service...');
    runCommand('start');
    break;
  
  case 'dashboard':
    console.log('📊 Starting dashboard server...');
    runCommand('dashboard');
    break;
  
  case 'dev':
    console.log('🔧 Starting in development mode...');
    runCommand('dev');
    break;
  
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  
  default:
    if (!command) {
      console.error('Error: No command specified.');
    } else {
      console.error(`Error: Unknown command '${command}'.`);
    }
    console.log('Run "repo-relay help" for usage information.');
    process.exit(1);
}