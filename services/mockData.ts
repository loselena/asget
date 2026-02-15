import type { User, Chat } from './types';

export const mockUsers: User[] = [
  {
    id: 1001,
    name: 'Alice',
    avatar: 'https://robohash.org/alice.png?set=set4',
    isOnline: true,
    contacts: [1002, 1003, 1004],
    uid: 'mock-alice',
  },
  {
    id: 1002,
    name: 'Bob',
    avatar: 'https://robohash.org/bob.png?set=set4',
    isOnline: false,
    contacts: [1001],
    uid: 'mock-bob',
  },
  {
    id: 1003,
    name: 'Charlie',
    avatar: 'https://robohash.org/charlie.png?set=set4',
    isOnline: true,
    contacts: [1001],
    uid: 'mock-charlie',
  },
  {
    id: 1004,
    name: 'Иван Петров',
    avatar: 'https://robohash.org/ivan.png?set=set4',
    isOnline: true,
    contacts: [1001],
    uid: 'mock-ivan',
  }
];

export const mockChats: Chat[] = [
  {
    id: 1,
    userIds: [1001, 1002],
    messages: [
      {
        id: 1,
        content: 'Hey Bob! How are you?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        senderId: 1001,
        type: 'text',
        status: 'read',
      },
      {
        id: 2,
        content: "I'm good, Alice! Just working on the new project.",
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        senderId: 1002,
        type: 'text',
        status: 'read',
        reactions: [
            { emoji: '👍', userIds: [1001] }
        ]
      },
       {
        id: 3,
        content: "Sounds exciting!",
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        senderId: 1001,
        type: 'text',
        status: 'delivered',
      },
      {
        id: 4,
        content: 'https://raw.githubusercontent.com/jerrykuku/staff-testing/main/cat.jpeg',
        caption: "Check out this cute cat!",
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        senderId: 1001,
        type: 'image',
        status: 'delivered',
      },
      {
        id: 5,
        content: 'Aww, so cute!',
        timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        senderId: 1002,
        type: 'text',
        status: 'sent',
      }
    ],
    unreadCount: 1,
  },
  {
    id: 2,
    userIds: [1001, 1003],
    messages: [
         {
        id: 6,
        content: "Hey Charlie, are we still on for lunch tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        senderId: 1001,
        type: 'text',
        status: 'read',
      },
       {
        id: 7,
        content: "Yep! See you at 12.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
        senderId: 1003,
        type: 'text',
        status: 'read',
      },
    ],
    unreadCount: 0,
  },
  {
    id: 3, // <-- Новый чат
    userIds: [1001, 1004],
    messages: [], // <-- Пустой чат для тестирования
    unreadCount: 0,
  }
];