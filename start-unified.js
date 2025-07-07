#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Unified Replit Server...');

// Start backend server
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a moment for backend to start
setTimeout(() => {
  // Start frontend server
  const frontend = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit', 
    shell: true,
    env: {
      ...process.env,
      DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
      PORT: '3000'
    }
  });

  frontend.on('close', (code) => {
    console.log('Frontend exited with code:', code);
    backend.kill();
  });
}, 2000);

backend.on('close', (code) => {
  console.log('Backend exited with code:', code);
});

process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  backend.kill();
  process.exit(0);
});