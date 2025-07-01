#!/bin/bash

echo "🚀 Starting WaV2 with Webhook Support"
echo "====================================="

# Check if ngrok is authenticated
if ! ngrok config check > /dev/null 2>&1; then
    echo "❌ NgRok not configured. Please run:"
    echo "   1. Go to https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "   2. Copy your authtoken"
    echo "   3. Run: ngrok config add-authtoken YOUR_TOKEN_HERE"
    echo "   4. Run this script again"
    exit 1
fi

echo "✅ NgRok is configured"

# Start ngrok in background
echo "🌐 Starting ngrok tunnel on port 5001..."
ngrok http 5001 > /dev/null 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Is ngrok running?"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "🔗 NgRok URL: $NGROK_URL"

# Update webhook configuration
cd backend
node setup-webhook.js "$NGROK_URL"

# Start the backend server
echo "🚀 Starting backend server..."
echo "📧 Webhook URL configured: $NGROK_URL/api/auth/unipile/callback"
echo ""
echo "✅ Ready! Your WhatsApp connections should now complete successfully."
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:5001"
echo "   - Webhook: $NGROK_URL/api/auth/unipile/callback"
echo ""
echo "Press Ctrl+C to stop all services"

# Start the backend
npm start

# Cleanup on exit
trap "kill $NGROK_PID 2>/dev/null" EXIT