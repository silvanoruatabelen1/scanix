import Database from 'better-sqlite3'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || './data.db'

export const db = new Database(DB_PATH)

export function migrate() {
  db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OPERARIO',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    basePrice REAL NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_rules (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    fromQty INTEGER NOT NULL,
    toQty INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_levels (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouseId TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    UNIQUE(productId, warehouseId)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    vendor TEXT NOT NULL,
    warehouse TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    photo TEXT
  );

  CREATE TABLE IF NOT EXISTS ticket_items (
    id TEXT PRIMARY KEY,
    ticketId TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    subtotal REAL NOT NULL
  );
  `)
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

