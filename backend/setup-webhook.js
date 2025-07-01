#!/usr/bin/env node

/**
 * Setup script to configure webhook URL for Unipile integration
 * Run this after starting ngrok tunnel
 */

const fs = require('fs');
const path = require('path');

function updateWebhookUrl(ngrokUrl) {
    const envPath = path.join(__dirname, '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Remove existing WEBHOOK_BASE_URL if present
    envContent = envContent.replace(/^WEBHOOK_BASE_URL=.*$/m, '');
    
    // Add new WEBHOOK_BASE_URL
    if (!envContent.endsWith('\n')) {
        envContent += '\n';
    }
    envContent += `WEBHOOK_BASE_URL=${ngrokUrl}\n`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated WEBHOOK_BASE_URL to: ${ngrokUrl}`);
    console.log('🔄 Restart your backend server to use the new webhook URL');
}

// Get ngrok URL from command line argument
const ngrokUrl = process.argv[2];

if (!ngrokUrl) {
    console.log('Usage: node setup-webhook.js <ngrok-url>');
    console.log('Example: node setup-webhook.js https://abc123.ngrok-free.app');
    process.exit(1);
}

if (!ngrokUrl.startsWith('https://')) {
    console.error('❌ Error: Webhook URL must be HTTPS');
    process.exit(1);
}

updateWebhookUrl(ngrokUrl);