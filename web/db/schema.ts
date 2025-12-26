import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const Screenshots = pgTable("screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: text("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type InsertScreenshot = typeof Screenshots.$inferInsert
export type SelectScreenshot = typeof Screenshots.$inferSelect

export const Messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  text: text("text").notNull(),
  sender: text("sender").notNull(),
  isFromMe: boolean("is_from_me").notNull(),
  chatId: text("chat_id").notNull(),
  isGroup: boolean("is_group").notNull(),
  messageDate: timestamp("message_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type InsertMessage = typeof Messages.$inferInsert
export type SelectMessage = typeof Messages.$inferSelect
