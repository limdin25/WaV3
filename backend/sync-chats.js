#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

async function syncChatsForAccount() {
  try {
    console.log('🔄 Starting chat sync for account W2r2hmOvSJ2tBUPQcjzp2w...');
    
    // Load current data
    const chatsData = await fs.readFile(path.join(__dirname, 'chats.json'), 'utf8');
    const messagesData = await fs.readFile(path.join(__dirname, 'messages.json'), 'utf8');
    
    let chats = JSON.parse(chatsData);
    let messages = JSON.parse(messagesData);
    
    console.log('📊 Current chats:', chats.length);
    console.log('📊 Current messages:', messages.length);
    
    const accountId = 'W2r2hmOvSJ2tBUPQcjzp2w';
    
    // Get chats from Unipile
    const chatsResponse = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/chats?account_id=${accountId}`, {
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const unipileChats = chatsResponse.data.items;
    console.log('📱 Found chats in Unipile for this account:', unipileChats.length);
    
    let newChatsAdded = 0;
    let newMessagesAdded = 0;
    
    // Process first 20 chats to avoid overwhelming the system
    const chatsToProcess = unipileChats.slice(0, 20);
    console.log('🔄 Processing first 20 chats...');
    
    for (const unipileChat of chatsToProcess) {
      // Check if chat already exists
      const existingChat = chats.find(c => c.chatId === unipileChat.id);
      
      if (!existingChat) {
        console.log(`✅ Adding new chat: ${unipileChat.name || unipileChat.provider_id || 'Unknown'} (${unipileChat.id})`);
        
        // Extract contact info from provider_id
        let contactName = 'Unknown Contact';
        let contactPhone = '';
        let isGroup = false;
        
        if (unipileChat.provider_id) {
          if (unipileChat.provider_id.endsWith('@g.us')) {
            // Group chat
            isGroup = true;
            contactName = unipileChat.name || 'Group Chat';
            contactPhone = ''; // Groups don't have phone numbers
          } else if (unipileChat.provider_id.endsWith('@s.whatsapp.net')) {
            // Individual chat
            contactPhone = unipileChat.provider_id.replace('@s.whatsapp.net', '');
            contactName = unipileChat.name || contactPhone; // Use name if available, otherwise show phone number
          }
        }
        
        const newChat = {
          id: uuidv4(),
          chatId: unipileChat.id,
          accountId: accountId,
          contactName: contactName,
          contactPhone: contactPhone,
          isGroup: isGroup,
          lastMessage: unipileChat.last_message?.text || '',
          lastMessageTime: unipileChat.last_message?.timestamp || new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        chats.push(newChat);
        newChatsAdded++;
        
        // Get recent messages for this chat
        try {
          const messagesResponse = await axios.get(`${process.env.UNIPILE_DSN}/api/v1/chats/${unipileChat.id}/messages?limit=50`, {
            headers: {
              'X-API-KEY': process.env.UNIPILE_API_KEY,
              'Content-Type': 'application/json'
            }
          });
          
          const unipileMessages = messagesResponse.data.items;
          console.log(`  💬 Found ${unipileMessages.length} messages for this chat`);
          
          for (const unipileMessage of unipileMessages) {
            // Check if message already exists
            const existingMessage = messages.find(m => m.messageId === unipileMessage.id);
            
            if (!existingMessage) {
              const newMessage = {
                id: uuidv4(),
                messageId: unipileMessage.id,
                chatId: unipileChat.id,
                accountId: accountId,
                message: unipileMessage.text || '',
                direction: unipileMessage.sender?.attendee_id?.includes(accountId) ? 'outbound' : 'inbound',
                sender: unipileMessage.sender,
                timestamp: unipileMessage.timestamp,
                attachments: unipileMessage.attachments || [],
                createdAt: new Date().toISOString()
              };
              
              messages.push(newMessage);
              newMessagesAdded++;
            }
          }
          
        } catch (messageError) {
          console.log(`  ⚠️  Could not fetch messages for chat ${unipileChat.id}:`, messageError.message);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Save updated data
    await fs.writeFile(
      path.join(__dirname, 'chats.json'), 
      JSON.stringify(chats, null, 2)
    );
    
    await fs.writeFile(
      path.join(__dirname, 'messages.json'), 
      JSON.stringify(messages, null, 2)
    );
    
    console.log(`\n💾 Sync complete!`);
    console.log(`📊 Added ${newChatsAdded} new chats`);
    console.log(`📊 Added ${newMessagesAdded} new messages`);
    console.log(`📊 Total chats now: ${chats.length}`);
    console.log(`📊 Total messages now: ${messages.length}`);
    console.log('\n✅ Chats should now appear in the inbox!');
    
  } catch (error) {
    console.error('💥 Sync error:', error.message);
    if (error.response) {
      console.error('📄 Response:', error.response.status, error.response.data);
    }
  }
}

// Run the sync
syncChatsForAccount();