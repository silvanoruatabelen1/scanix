import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db, migrate, uid } from './db'
import { z } from 'zod'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const PORT = Number(process.env.PORT || 4001)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

function auth(req: any, res: any, next: any) {
  const h = req.headers.authorization
  if (!h) return res.status(401).json({ error: 'No token' })
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Seed minimal if empty
function seedIfEmpty() {
  const countUsers = db.prepare('SELECT COUNT(1) as c FROM users').get() as any
  if (countUsers.c > 0) return
  const adminId = uid()
  db.prepare('INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,?)')
    .run(adminId, 'admin@example.com', bcrypt.hashSync('admin123', 8), 'Admin', 'ADMIN')
  const w1 = uid(); const w2 = uid()
  db.prepare('INSERT INTO warehouses(id,name) VALUES(?,?),(?,?)').run(w1, 'Deposito Central', w2, 'Deposito Norte')
  const p1 = uid(); const p2 = uid()
  db.prepare('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)')
    .run(p1, 'Aceite de Oliva Extra Virgen 500ml', 'AOL-500', 'Aceites', '', 8.5)
  db.prepare('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)')
    .run(p2, 'Arroz Integral 1kg', 'ARR-1000', 'Granos', '', 3.2)
  db.prepare('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)').run(uid(), p1, '/placeholder.svg')
  db.prepare('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)').run(uid(), p2, '/placeholder.svg')
  const rp = db.prepare('INSERT INTO price_rules(id,productId,fromQty,toQty,price) VALUES(?,?,?,?,?)')
  ;[
    { pid: p1, from:1,to:9,price:8.5 },{ pid:p1, from:10,to:49,price:7.8 },{ pid:p1, from:50,to:999,price:7.2 },
    { pid: p2, from:1,to:19,price:3.2 },{ pid:p2, from:20,to:99,price:2.9 }
  ].forEach(r => rp.run(uid(), r.pid, r.from, r.to, r.price))
  db.prepare('INSERT INTO stock_levels(id,productId,warehouseId,quantity) VALUES(?,?,?,?)').run(uid(), p1, w1, 45)
  db.prepare('INSERT INTO stock_levels(id,productId,warehouseId,quantity) VALUES(?,?,?,?)').run(uid(), p2, w1, 23)
}

// Start DB
migrate()
seedIfEmpty()

// Auth
app.post('/api/auth/login', (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(4) })
  const b = schema.parse(req.body)
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(b.email) as any
  if (!u) return res.status(401).json({ error: 'Credenciales inválidas' })
  if (!bcrypt.compareSync(b.password, u.password)) return res.status(401).json({ error: 'Credenciales inválidas' })
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, user: { id: u.id, name: u.name, role: u.role } })
})

// Products
app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT * FROM products').all() as any[]
  const images = db.prepare('SELECT * FROM product_images WHERE productId = ?')
  const rules = db.prepare('SELECT fromQty as "from", toQty as "to", price FROM price_rules WHERE productId = ? ORDER BY fromQty')
  const stock = db.prepare('SELECT * FROM stock_levels WHERE productId = ?')
  const out = products.map(p => ({
    ...p,
    images: images.all(p.id).map((i:any)=>i.url),
    priceRules: rules.all(p.id),
    stocks: stock.all(p.id)
  }))
  res.json(out)
})

app.post('/api/products', auth, (req, res) => {
  const schema = z.object({
    name: z.string().min(1), sku: z.string().min(1), category: z.string().min(1), description: z.string().optional(),
    price: z.number().positive(), images: z.array(z.string()).default([]),
    priceRules: z.array(z.object({ from: z.number().int().positive(), to: z.number().int().positive(), price: z.number().positive() })).default([])
  })
  const b = schema.parse(req.body)
  const exists = db.prepare('SELECT 1 FROM products WHERE sku = ?').get(b.sku)
  if (exists) return res.status(400).json({ error: 'SKU duplicado' })
  const sorted = [...b.priceRules].sort((a,b)=>a.from-b.from)
  for (let i=1;i<sorted.length;i++) if (sorted[i].from <= sorted[i-1].to) return res.status(400).json({ error: 'Reglas solapadas' })
  const id = uid()
  db.prepare('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)')
    .run(id, b.name, b.sku, b.category, b.description||'', b.price)
  const insImg = db.prepare('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)')
  b.images.forEach(u => insImg.run(uid(), id, u))
  const insRule = db.prepare('INSERT INTO price_rules(id,productId,fromQty,toQty,price) VALUES(?,?,?,?,?)')
  b.priceRules.forEach(r => insRule.run(uid(), id, r.from, r.to, r.price))
  res.json({ id })
})

// Scan mock
app.post('/api/scan', upload.single('image'), (_req, res) => {
  const all = db.prepare('SELECT id, sku, name FROM products LIMIT 5').all() as any[]
  const out = all.slice(0,3).map((p,idx)=>({ id:p.id, sku:p.sku, name:p.name, quantity: idx+1, confidence: 90 - idx*10 }))
  res.json({ products: out })
})

// Tickets: confirm sale and decrement stock (by warehouse name or id)
app.post('/api/tickets', auth, (req, res) => {
  const schema = z.object({ id: z.string(), vendor: z.string(), warehouse: z.string(), photo: z.string().optional(), items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().positive() })) })
  const b = schema.parse(req.body)
  const getWh = db.prepare('SELECT id,name FROM warehouses WHERE id = ? OR name = ?')
  const wh = getWh.get(b.warehouse, b.warehouse) as any
  if (!wh) return res.status(400).json({ error: 'Depósito inválido' })
  const txn = db.transaction(() => {
    // check stock
    for (const it of b.items) {
      const prod = db.prepare('SELECT id FROM products WHERE sku = ?').get(it.sku) as any
      if (!prod) throw new Error(`Producto no encontrado: ${it.sku}`)
      const st = db.prepare('SELECT quantity FROM stock_levels WHERE productId = ? AND warehouseId = ?').get(prod.id, wh.id) as any
      const qty = st?.quantity ?? 0
      if (qty < it.quantity) throw new Error(`Stock insuficiente para ${it.sku}`)
    }
    for (const it of b.items) {
      const prod = db.prepare('SELECT id FROM products WHERE sku = ?').get(it.sku) as any
      db.prepare('UPDATE stock_levels SET quantity = quantity - ? WHERE productId = ? AND warehouseId = ?').run(it.quantity, prod.id, wh.id)
    }
    const now = new Date()
    db.prepare('INSERT INTO tickets(id,date,time,vendor,warehouse,total,status,photo) VALUES(?,?,?,?,?,?,?,?)')
      .run(b.id, now.toISOString().slice(0,10), now.toTimeString().slice(0,5), b.vendor, wh.name, b.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0), 'confirmada', b.photo||null)
    const ins = db.prepare('INSERT INTO ticket_items(id,ticketId,name,sku,quantity,unitPrice,subtotal) VALUES(?,?,?,?,?,?,?)')
    b.items.forEach(i => ins.run(uid(), b.id, i.sku, i.sku, i.quantity, i.unitPrice, i.quantity*i.unitPrice))
  })
  try { txn(); res.json({ ok: true }) } catch(e:any){ res.status(400).json({ error: e.message }) }
})

app.get('/api/tickets', auth, (_req,res)=>{
  const list = db.prepare('SELECT * FROM tickets ORDER BY rowid DESC').all() as any[]
  res.json(list)
})

app.get('/api/health', (_req,res)=>res.json({ ok:true }))

app.listen(PORT, ()=> console.log(`server-lite on http://localhost:${PORT}`))

