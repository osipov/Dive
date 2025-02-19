import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  role: text("role").notNull(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id").notNull(),
  createdAt: text("created_at").notNull(),
  files: text("files", { mode: "json" }).notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: text("chat_id").notNull().references(() => chats.id),
  createdAt: text("created_at").notNull(),
  description: text("description").notNull().default(""),
  prompt: text("prompt").notNull().default(""),
  frequency: integer("frequency").notNull().default(0),
  startDelay: integer("start_delay").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastRunTime: text("last_run_time"),
  nextRunTime: text("next_run_time"),
});

// export types
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
