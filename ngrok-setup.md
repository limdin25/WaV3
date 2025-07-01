# NgRok Setup Guide for WhatsApp Integration

## Why We Need NgRok
Your WhatsApp connections are stuck in "pending" state because Unipile's servers can't reach your localhost:5001 for webhook callbacks. NgRok creates a secure tunnel to expose your local server publicly.

## Setup Instructions

1. **Get Your Auth Token**
   - Go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Sign up/login to ngrok if needed
   - Copy your authtoken

2. **Configure NgRok**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

3. **Start the Tunnel**
   ```bash
   ngrok http 5001
   ```

4. **Update Backend Configuration**
   - Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok-free.app)
   - Update the notify_url in server.js to use this URL

## Current Status
- You have 4 pending WhatsApp connections that need webhook callbacks
- Once ngrok is running, these should complete automatically
- The system will filter to show only app-connected accounts

## Next Steps
1. Complete ngrok authentication
2. Start the tunnel  
3. Update notify_url in the backend
4. Test WhatsApp connection flow