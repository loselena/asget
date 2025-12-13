
import type { User, Chat, Message, SignalPayload } from '../types';
import { supabase, isSupabaseInitialized } from './supabase';

// Helper to create a deterministic ID from a string.
export const stringToId = (str: string): number => {
  let hash = 0;
  const cleanedStr = str.toLowerCase().trim();
  for (let i = 0; i < cleanedStr.length; i++) {
    const char = cleanedStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const AppService = {
  
  // --- Auth (Simulation via User Table) ---
  signIn: async (): Promise<{ user: { uid: string } }> => {
      if (!isSupabaseInitialized || !supabase) throw new Error("Supabase not initialized");
      // Return placeholder, ID is generated in createOrUpdateUser
      return { user: { uid: '' } }; 
  },

  // --- User Profile ---
  createOrUpdateUser: async (tempUid: string, name: string): Promise<User> => {
    if (!supabase) throw new Error("Database not initialized");
    
    const numericId = stringToId(name);
    const dbUid = `user_${numericId}`; 

    // 1. Try to get existing user (using maybeSingle to avoid error if not found)
    let { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', dbUid)
        .maybeSingle();

    if (fetchError) {
        console.error("Error fetching existing user:", JSON.stringify(fetchError, null, 2));
    }

    if (existingUser) {
        // Update online status
        await supabase.from('users').update({ is_online: true }).eq('uid', dbUid);
    } else {
        const newUser = {
            id_num: numericId,
            uid: dbUid,
            name,
            avatar: `https://robohash.org/${name}.png?set=set4`,
            is_online: true,
            contacts: []
        };
        
        // 2. Insert or skip if exists (handle race conditions)
        const { error: insertError } = await supabase
            .from('users')
            .upsert(newUser, { onConflict: 'uid', ignoreDuplicates: true });
        
        if (insertError) {
            console.error("Error creating/upserting user:", JSON.stringify(insertError, null, 2));
            // Proceed to fetch anyway, as it might have failed because it exists
        }

        // 3. Fetch final record
        const { data: createdUser, error: finalError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', dbUid)
            .single();
            
        if (finalError || !createdUser) {
            console.error("Critical: Failed to retrieve user after creation attempt.", JSON.stringify(finalError, null, 2));
            throw new Error("Could not create or retrieve user profile. Check database schema/permissions.");
        }
        
        existingUser = createdUser;
    }

    return {
        id: existingUser.id_num,
        uid: existingUser.uid,
        name: existingUser.name,
        avatar: existingUser.avatar,
        isOnline: true,
        contacts: existingUser.contacts || []
    };
  },

  setOnlineStatus: async (uid: string, isOnline: boolean) => {
      if (!supabase) return;
      await supabase.from('users').update({ is_online: isOnline }).eq('uid', uid);
  },

  // --- Contacts ---
  addContact: async (currentUser: User, contactId: number): Promise<User | null> => {
    if (!supabase) return null;
    
    // 1. Find contact by numeric ID
    const { data: contactRecord, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_num', contactId)
        .single();

    if (error || !contactRecord) {
        console.error("Contact lookup failed:", JSON.stringify(error, null, 2));
        throw new Error("Пользователь не найден.");
    }

    const contactUser: User = {
        id: contactRecord.id_num,
        uid: contactRecord.uid,
        name: contactRecord.name,
        avatar: contactRecord.avatar,
        isOnline: contactRecord.is_online,
        contacts: contactRecord.contacts || []
    };

    // 2. Add to current user's contact list
    const { data: currentUserRecord } = await supabase.from('users').select('contacts').eq('uid', currentUser.uid).single();
    const currentContacts = currentUserRecord?.contacts || [];
    
    if (!currentContacts.includes(contactId)) {
        const updatedContacts = [...currentContacts, contactId];
        await supabase.from('users').update({ contacts: updatedContacts }).eq('uid', currentUser.uid);
    }
    
    // 3. Create or find chat
    await AppService.createChatIfNotExists(currentUser, contactUser);

    return contactUser;
  },

  // --- Chats ---
  createChatIfNotExists: async (user1: User, user2: User) => {
      if (!supabase) return;
      
      const chatIdStr = [user1.id, user2.id].sort((a,b) => a - b).join('-');
      
      // Use upsert with ignoreDuplicates to avoid race conditions
      const newChat = {
          uid: chatIdStr,
          user_ids: [user1.id, user2.id],
          last_message_timestamp: new Date().toISOString()
      };
      
      const { error } = await supabase.from('chats').upsert(newChat, { onConflict: 'uid', ignoreDuplicates: true });
      if (error) {
          console.error("Error creating chat:", JSON.stringify(error, null, 2));
      }
  },

  sendMessage: async (chatUid: string, message: Message) => {
      if (!supabase) return;
      
      const dbMessage = {
          chat_uid: chatUid,
          content: message.content,
          sender_id: message.senderId,
          type: message.type,
          status: message.status,
          caption: message.caption,
          timestamp: message.timestamp,
          link_preview: message.linkPreview,
          forwarded_from: message.forwardedFrom
      };
      
      const { error } = await supabase.from('messages').insert(dbMessage);
      if (error) console.error("Error sending message:", JSON.stringify(error, null, 2));

      await supabase.from('chats').update({ last_message_timestamp: message.timestamp }).eq('uid', chatUid);
  },
  
  deleteMessage: async(chatUid: string, messageId: number) => {
      if (!supabase) return;
      await supabase.from('messages').delete().eq('id', messageId);
  },

  addReaction: async (chatUid: string, messageId: number, reaction: { emoji: string, userId: number }) => {
     if(!supabase) return;
     
     const { data: msg } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
     if (msg) {
         let reactions = msg.reactions || [];
         const existingReactionIndex = reactions.findIndex((r: any) => r.emoji === reaction.emoji);
         
         if (existingReactionIndex > -1) {
             const userIndex = reactions[existingReactionIndex].userIds.indexOf(reaction.userId);
             if (userIndex > -1) {
                 reactions[existingReactionIndex].userIds.splice(userIndex, 1);
                 if (reactions[existingReactionIndex].userIds.length === 0) {
                     reactions.splice(existingReactionIndex, 1);
                 }
             } else {
                 reactions[existingReactionIndex].userIds.push(reaction.userId);
             }
         } else {
             reactions.push({ emoji: reaction.emoji, userIds: [reaction.userId] });
         }
         
         await supabase.from('messages').update({ reactions }).eq('id', messageId);
     }
  },
  
  markChatRead: async (chatUid: string, currentUserId: number) => {
      if (!supabase) return;
      await supabase.from('messages')
        .update({ status: 'read' })
        .eq('chat_uid', chatUid)
        .neq('sender_id', currentUserId)
        .neq('status', 'read');
  },
  
  // --- Storage ---
  uploadFile: async (file: File): Promise<string | null> => {
      if (!supabase) return null;
      
      const bucketName = 'chat-media';
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Attempt upload
      let { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      // 2. If bucket not found, try to auto-create it
      if (uploadError && (uploadError.message.includes('Bucket not found') || (uploadError as any).error === 'Bucket not found')) {
          console.warn(`Bucket '${bucketName}' not found. Attempting to create...`);
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true
          });
          
          if (createError) {
               console.error("Failed to auto-create bucket via client:", JSON.stringify(createError, null, 2));
               // We cannot proceed if creation fails (likely due to permissions)
          } else {
              console.log(`Bucket '${bucketName}' created successfully. Retrying upload...`);
              // Retry upload
              const { error: retryError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);
              uploadError = retryError;
          }
      }

      if (uploadError) {
          console.error("Error uploading file:", JSON.stringify(uploadError, null, 2));
          return null;
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return data.publicUrl;
  },

  // --- Realtime Listeners ---
  
  subscribeToUser: (uid: string, onUpdate: (user: User) => void) => {
      if (!supabase) return () => {};
      
      const channel = supabase.channel(`user:${uid}`)
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'users', filter: `uid=eq.${uid}` }, 
            (payload) => {
                const newUser = payload.new;
                onUpdate({
                    id: newUser.id_num,
                    uid: newUser.uid,
                    name: newUser.name,
                    avatar: newUser.avatar,
                    isOnline: newUser.is_online,
                    contacts: newUser.contacts || []
                });
            }
        )
        .subscribe();

      return () => { supabase?.removeChannel(channel); };
  },

  subscribeToAllUsers: (onUpdate: (users: User[]) => void) => {
      if (!supabase) return () => {};
      
      const fetchAll = async () => {
          const { data } = await supabase!.from('users').select('*');
          if (data) {
              const users = data.map((u: any) => ({
                  id: u.id_num,
                  uid: u.uid,
                  name: u.name,
                  avatar: u.avatar,
                  isOnline: u.is_online,
                  contacts: u.contacts || []
              }));
              onUpdate(users);
          }
      };

      fetchAll();

      const channel = supabase.channel('all_users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
             fetchAll();
        })
        .subscribe();

      return () => { supabase?.removeChannel(channel); };
  },

  subscribeToChats: (userId: number, onUpdate: (chats: Chat[]) => void) => {
      if (!supabase) return () => {};

      const fetchChats = async () => {
          const { data: chatData } = await supabase!
            .from('chats')
            .select('*')
            .contains('user_ids', [userId]);

          if (!chatData) return;

          const chats: Chat[] = [];
          
          for (const c of chatData) {
              const { data: msgs } = await supabase!
                .from('messages')
                .select('*')
                .eq('chat_uid', c.uid)
                .order('timestamp', { ascending: true });

              const messages = (msgs || []).map((m: any) => ({
                  id: m.id, 
                  content: m.content,
                  timestamp: m.timestamp,
                  senderId: m.sender_id,
                  type: m.type,
                  status: m.status,
                  caption: m.caption,
                  linkPreview: m.link_preview,
                  reactions: m.reactions,
                  forwardedFrom: m.forwarded_from,
                  _docId: m.id 
              } as Message));

              chats.push({
                  id: parseInt(c.uid.replace(/-/g, '').substring(0, 8), 16),
                  uid: c.uid,
                  userIds: c.user_ids,
                  messages: messages,
                  unreadCount: messages.filter(m => m.senderId !== userId && m.status !== 'read').length,
                  lastMessageTimestamp: c.last_message_timestamp
              });
          }
          
          chats.sort((a, b) => {
              const dateA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
              const dateB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
              return dateB - dateA;
          });

          onUpdate(chats);
      };

      fetchChats();

      const channel = supabase.channel(`chats_for_${userId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
             fetchChats(); 
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
             fetchChats();
          })
          .subscribe();

      return () => { supabase?.removeChannel(channel); };
  },
  
  subscribeToChatMessages: (chatUid: string, onUpdate: (messages: Message[]) => void) => {
      if (!supabase) return () => {};
      
      const fetchMessages = async () => {
          const { data: msgs } = await supabase!
            .from('messages')
            .select('*')
            .eq('chat_uid', chatUid)
            .order('timestamp', { ascending: true });
            
          const messages = (msgs || []).map((m: any) => ({
                id: m.id,
                content: m.content,
                timestamp: m.timestamp,
                senderId: m.sender_id,
                type: m.type,
                status: m.status,
                caption: m.caption,
                linkPreview: m.link_preview,
                reactions: m.reactions,
                forwardedFrom: m.forwarded_from,
                _docId: m.id 
          } as Message));
          onUpdate(messages);
      };
      
      fetchMessages();

      const channel = supabase.channel(`messages:${chatUid}`)
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'messages', filter: `chat_uid=eq.${chatUid}` }, 
            () => {
               fetchMessages();
            }
          )
          .subscribe();

      return () => { supabase?.removeChannel(channel); };
  },

  // --- Signaling (WebRTC) ---
  
  sendSignal: async (recipientId: number, payload: SignalPayload): Promise<boolean> => {
      if (!supabase) {
          console.error("Supabase not initialized, cannot send signal");
          return false;
      }
      
      console.log(`[AppService] Sending signal (${payload.type}) to user ${recipientId}`);
      
      const { error } = await supabase.from('signals').insert({
          type: payload.type,
          payload: payload.payload,
          sender_id: payload.senderId,
          recipient_id: recipientId,
          timestamp: new Date().toISOString()
      });
      
      if (error) {
          console.error("[AppService] Failed to send signal:", error);
          return false;
      }
      return true;
  },
  
  deleteSignal: async (signalId: number) => {
      if (!supabase) return;
      await supabase.from('signals').delete().eq('id', signalId);
  },

  subscribeToSignals: (currentUserId: number, onSignal: (signal: SignalPayload) => void) => {
      if (!supabase) return () => {};

      console.log(`[AppService] Subscribing to signals for user: ${currentUserId}`);

      const channel = supabase.channel(`signals:${currentUserId}`)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'signals', filter: `recipient_id=eq.${currentUserId}` }, 
            (payload) => {
                console.log("[AppService] Signal received:", payload.new.type);
                const newSignal = payload.new;
                onSignal({
                    id: newSignal.id,
                    type: newSignal.type,
                    payload: newSignal.payload,
                    senderId: newSignal.sender_id,
                    targetId: newSignal.recipient_id
                });
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                 console.log(`[AppService] Successfully subscribed to signal channel`);
            }
            if (status === 'CHANNEL_ERROR') {
                 console.error(`[AppService] Signal channel subscription error`);
            }
        });

      return () => { 
          console.log(`[AppService] Unsubscribing from signals`);
          supabase?.removeChannel(channel); 
      };
  }
};
