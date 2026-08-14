import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const providerCredentials = sqliteTable("provider_credentials", {
  provider: text("provider").primaryKey(),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  model: text("model").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const savedDocuments = sqliteTable("saved_documents", {
  id: text("id").primaryKey(),
  encryptedPayload: text("encrypted_payload").notNull(),
  iv: text("iv").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_saved_documents_created_at").on(table.createdAt)]);
