import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DB_PATH || './data.db'

let db: Database

export async function openDB() {
  if (db) return db
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve('sql.js/dist/sql-wasm.wasm') })
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(filebuffer)
  } else {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new SQL.Database()
  }
  return db
}

export function saveDB() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

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

export const dbApi = {
  all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: any[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows as T[]
  },
  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const row = stmt.step() ? (stmt.getAsObject() as any) : undefined
    stmt.free()
    return row as T | undefined
  },
  run(sql: string, params: any[] = []) {
    const stmt = db.prepare(sql)
    stmt.run(params)
    stmt.free()
  },
  transaction(fn: () => void) {
    db.exec('BEGIN')
    try {
      fn()
      db.exec('COMMIT')
      saveDB()
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  },
}

export { db }
