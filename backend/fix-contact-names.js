#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

async function fixContactNames() {
  try {
    console.log('🔧 Starting contact name fix...');
    
    // Load current data
    const chatsData = await fs.readFile(path.join(__dirname, 'chats.json'), 'utf8');
    let chats = JSON.parse(chatsData);
    
    console.log('📊 Total chats to fix:', chats.length);
    
    // Only fix chats for the target account
    const targetAccountId = 'W2r2hmOvSJ2tBUPQcjzp2w';
    const chatsToFix = chats.filter(c => 
      c.accountId === targetAccountId && 
      (c.contactName === 'Unknown Contact' || !c.contactPhone)
    );
    
    console.log('📊 Chats that need fixing:', chatsToFix.length);
    
    if (chatsToFix.length === 0) {
      console.log('✅ No chats need fixing!');
      return;
    }
    
    // Get all chats from Unipile for this account
    const unipileResponse = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/chats?account_id=${targetAccountId}`, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const unipileChats = unipileResponse.data.items;
    console.log('📱 Found chats in Unipile:', unipileChats.length);
    
    let fixedCount = 0;
    
    // Create a lookup map for fast searching
    const unipileChatMap = {};
    unipileChats.forEach(unipileChat => {
      unipileChatMap[unipileChat.id] = unipileChat;
    });
    
    // Fix each chat
    for (const chat of chatsToFix) {
      const unipileChat = unipileChatMap[chat.chatId];
      
      if (unipileChat && unipileChat.provider_id) {
        let contactName = 'Unknown Contact';
        let contactPhone = '';
        let isGroup = false;
        
        if (unipileChat.provider_id.endsWith('@g.us')) {
          // Group chat
          isGroup = true;
          contactName = unipileChat.name || 'Group Chat';
          contactPhone = '';
        } else if (unipileChat.provider_id.endsWith('@s.whatsapp.net')) {
          // Individual chat
          contactPhone = unipileChat.provider_id.replace('@s.whatsapp.net', '');
          contactName = unipileChat.name || contactPhone;
        }
        
        // Update the chat
        chat.contactName = contactName;
        chat.contactPhone = contactPhone;
        chat.isGroup = isGroup;
        
        console.log(`✅ Fixed: ${chat.chatId} -> ${contactName} (${isGroup ? 'Group' : 'Individual'})`);
        fixedCount++;
      } else {
        console.log(`⚠️  Could not find Unipile data for chat: ${chat.chatId}`);
      }
    }
    
    // Save updated data
    await fs.writeFile(
      path.join(__dirname, 'chats.json'), 
      JSON.stringify(chats, null, 2)
    );
    
    console.log(`\n💾 Fix complete!`);
    console.log(`📊 Fixed ${fixedCount} chats`);
    console.log('✅ Contact names should now display properly in the UI!');
    
  } catch (error) {
    console.error('💥 Fix error:', error.message);
    if (error.response) {
      console.error('📄 Response:', error.response.status, error.response.data);
    }
  }
}

// Run the fix
fixContactNames();