#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to your SQLite database
const dbPath = '/Users/osipov/Library/Application Support/dive/Shared Dictionary/db';

try {
    const db = new Database(dbPath);
    
    // Get list of all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    console.log('Tables in database:');
    tables.forEach(table => {
        console.log(`- ${table.name}`);
    });

    // Check if chats table exists and show its contents
    const hasChatsTable = tables.some(table => table.name === 'chats');
    
    if (hasChatsTable) {
        console.log('\nContents of chats table:');
        const chats = db.prepare('SELECT * FROM chats').all();
        console.log(JSON.stringify(chats, null, 2));
    } else {
        console.log('\nChats table does not exist in the database');
    }
    
    // Close the database connection
    db.close();
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
