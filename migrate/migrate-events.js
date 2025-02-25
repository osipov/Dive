#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to your SQLite database
const dbPath = ' /Users/osipov/Library/Preferences/dive/data.db';

try {
    const db = new Database(dbPath);
    
    // Create the events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            prompt TEXT NOT NULL DEFAULT '',
            frequency INTEGER NOT NULL DEFAULT 0,
            start_delay INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_run_time TEXT,
            next_run_time TEXT,
            FOREIGN KEY (chat_id) REFERENCES chats(id)
        );
    `);

    console.log('Events table created successfully');
    
    // Close the database connection
    db.close();
} catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
}
