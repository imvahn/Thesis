// import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';

export const samplesTable = sqliteTable('samples', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  // The sample column is of type blob, which can store binary data like an .mp3 file.
  sample: blob('sample').notNull(),
});

export type InsertSample = typeof samplesTable.$inferInsert;
export type SelectSample = typeof samplesTable.$inferSelect;
