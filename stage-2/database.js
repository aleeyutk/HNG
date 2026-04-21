const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            gender TEXT,
            gender_probability REAL,
            age INTEGER,
            age_group TEXT,
            country_id TEXT,
            country_name TEXT,
            country_probability REAL,
            created_at TEXT
        )
    `);

    return db;
}

function getDB() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

module.exports = { initDB, getDB };
