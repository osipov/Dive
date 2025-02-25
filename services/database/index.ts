import Database from "better-sqlite3";
import { and, eq, gt, desc, asc } from "drizzle-orm";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { writeFileSync } from "fs";
import { join } from "path";
import logger from "../utils/logger.js";
import * as schema from "./schema.js";
import { chats, messages, events, type NewMessage, type NewEvent } from "./schema.js";

export let db: BetterSQLite3Database<typeof schema>;

export const setDatabase = (_db: BetterSQLite3Database<typeof schema>) => {
  db = _db;
};

export const initDatabase = (dbPath?: string) => {
  try {
    const sqlite = new Database(dbPath || "data/database.sqlite");
    
    // Run migrations first to ensure tables exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        created_at text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        content text NOT NULL,
        role text NOT NULL,
        chat_id text NOT NULL,
        message_id text NOT NULL,
        created_at text NOT NULL,
        files text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        chat_id text NOT NULL,
        created_at text NOT NULL,
        description text NOT NULL DEFAULT '',
        prompt text NOT NULL DEFAULT '',
        frequency integer NOT NULL DEFAULT 0,
        start_delay integer NOT NULL DEFAULT 0,
        is_active integer NOT NULL DEFAULT 1,
        last_run_time text,
        next_run_time text,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      );
    `);

    // Initialize Drizzle
    db = drizzle(sqlite, { schema: schema });

    // Create index after tables are created
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS message_chat_id_idx
        ON messages(chat_id)
    `);

    logger.info("Database initialized");
    
    // Write database location to file
    const dbLocation = dbPath || "data/database.sqlite";    
    return db;
  } catch (error) {
    logger.error("Error initializing database:", error);
    throw error;
  }
};

export const getAllChats = async () => {
  const chats = await db.query.chats.findMany();
  return chats.reverse();
};

export const getChatWithMessages = async (chatId: string) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) return null;

  const history = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
  });

  return { chat, messages: history };
};

// Add new chat
export const createChat = async (chatId: string, title: string) => {
  const [chat] = await db
    .insert(chats)
    .values({ id: chatId, title, createdAt: new Date().toISOString() })
    .returning();
  return chat;
};

// Add new message
export const createMessage = async (data: NewMessage) => {
  return await db.transaction(async (tx) => {
    // Ensure chat exists
    const chatExists = await tx.query.chats.findFirst({
      where: eq(chats.id, data.chatId),
    });

    if (!chatExists) {
      throw new Error(`Chat ${data.chatId} does not exist`);
    }

    const [message] = await tx.insert(messages).values(data).returning();

    return message;
  });
};

// Check if chat exists
export const checkChatExists = async (chatId: string) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  return !!chat;
};

export const deleteChat = async (chatId: string) => {
  await db.delete(chats).where(eq(chats.id, chatId));
  await db.delete(messages).where(eq(messages.chatId, chatId));
};

// Delete messages after a specific messageId in a chat
export const deleteMessagesAfter = async (chatId: string, messageId: string) => {
  const targetMessage = await db.query.messages.findFirst({
    where: eq(messages.messageId, messageId),
  });

  if (!targetMessage) {
    throw new Error(`Message ${messageId} does not exist`);
  }

  // Delete all messages with id greater than or equal to the target message's id
  await db.delete(messages).where(and(eq(messages.chatId, chatId), gt(messages.id, targetMessage.id - 1)));
};

// Get all events
export const getAllEvents = async () => {
  return await db.query.events.findMany({
    orderBy: desc(events.createdAt),
  });
};

// Get all events for a specific chat
export const getChatEvents = async (chatId: string) => {
  return await db.query.events.findMany({
    where: eq(events.chatId, chatId),
    orderBy: desc(events.createdAt),
  });
};

// Get all active events for a specific chat
export const getActiveChatEvents = async (chatId: string) => {
  return await db.query.events.findMany({
    where: and(
      eq(events.chatId, chatId),
      eq(events.isActive, true)
    ),
    orderBy: desc(events.createdAt),
  });
};

// Create a new event
export const createEvent = async (data: NewEvent) => {
  // Ensure chat exists
  const chatExists = await checkChatExists(data.chatId);
  if (!chatExists) {
    throw new Error(`Chat ${data.chatId} does not exist`);
  }

  const [event] = await db
    .insert(events)
    .values({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    })
    .returning();
  return event;
};

// Delete an event by id
export const deleteEvent = async (eventId: number) => {
  await db.delete(events).where(eq(events.id, eventId));
};

// Set event active status
export const setEventActive = async (eventId: number, active: boolean) => {
  const [event] = await db
    .update(events)
    .set({ isActive: active })
    .where(eq(events.id, eventId))
    .returning();
  
  if (!event) {
    throw new Error(`Event ${eventId} does not exist`);
  }
  
  return event;
};
