import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { openDB, migrate, uid, dbApi } from './db'
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
  const countUsers = dbApi.get<{ c: number }>('SELECT COUNT(1) as c FROM users') as any
  if (countUsers && countUsers.c > 0) return
  const adminId = uid()
  dbApi.run('INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,?)', [adminId, 'admin@example.com', bcrypt.hashSync('admin123', 8), 'Admin', 'ADMIN'])
  const w1 = uid(); const w2 = uid()
  dbApi.run('INSERT INTO warehouses(id,name) VALUES(?,?)', [w1, 'Deposito Central'])
  dbApi.run('INSERT INTO warehouses(id,name) VALUES(?,?)', [w2, 'Deposito Norte'])
  const p1 = uid(); const p2 = uid()
  dbApi.run('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)', [p1, 'Aceite de Oliva Extra Virgen 500ml', 'AOL-500', 'Aceites', '', 8.5])
  dbApi.run('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)', [p2, 'Arroz Integral 1kg', 'ARR-1000', 'Granos', '', 3.2])
  dbApi.run('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)', [uid(), p1, '/placeholder.svg'])
  dbApi.run('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)', [uid(), p2, '/placeholder.svg'])
  ;[
    { pid: p1, from:1,to:9,price:8.5 },{ pid:p1, from:10,to:49,price:7.8 },{ pid:p1, from:50,to:999,price:7.2 },
    { pid: p2, from:1,to:19,price:3.2 },{ pid:p2, from:20,to:99,price:2.9 }
  ].forEach(r => dbApi.run('INSERT INTO price_rules(id,productId,fromQty,toQty,price) VALUES(?,?,?,?,?)', [uid(), r.pid, r.from, r.to, r.price]))
  dbApi.run('INSERT INTO stock_levels(id,productId,warehouseId,quantity) VALUES(?,?,?,?)', [uid(), p1, w1, 45])
  dbApi.run('INSERT INTO stock_levels(id,productId,warehouseId,quantity) VALUES(?,?,?,?)', [uid(), p2, w1, 23])
}

await openDB()
migrate()
seedIfEmpty()

// Auth
app.post('/api/auth/login', (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(4) })
  const b = schema.parse(req.body)
  const u = dbApi.get<any>('SELECT * FROM users WHERE email = ?', [b.email])
  if (!u) return res.status(401).json({ error: 'Credenciales inválidas' })
  if (!bcrypt.compareSync(b.password, u.password)) return res.status(401).json({ error: 'Credenciales inválidas' })
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, user: { id: u.id, name: u.name, role: u.role } })
})

// Products
app.get('/api/products', (_req, res) => {
  const products = dbApi.all<any>('SELECT * FROM products')
  const out = products.map(p => ({
    ...p,
    images: dbApi.all<any>('SELECT url FROM product_images WHERE productId = ?', [p.id]).map(i=>i.url),
    priceRules: dbApi.all<any>('SELECT fromQty as "from", toQty as "to", price FROM price_rules WHERE productId = ? ORDER BY fromQty', [p.id]),
    stocks: dbApi.all<any>('SELECT * FROM stock_levels WHERE productId = ?', [p.id])
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
  const exists = dbApi.get('SELECT 1 FROM products WHERE sku = ?', [b.sku])
  if (exists) return res.status(400).json({ error: 'SKU duplicado' })
  const sorted = [...b.priceRules].sort((a,b)=>a.from-b.from)
  for (let i=1;i<sorted.length;i++) if (sorted[i].from <= sorted[i-1].to) return res.status(400).json({ error: 'Reglas solapadas' })
  const id = uid()
  dbApi.run('INSERT INTO products(id,name,sku,category,description,basePrice) VALUES(?,?,?,?,?,?)', [id, b.name, b.sku, b.category, b.description||'', b.price])
  b.images.forEach(u => dbApi.run('INSERT INTO product_images(id,productId,url) VALUES(?,?,?)', [uid(), id, u]))
  b.priceRules.forEach(r => dbApi.run('INSERT INTO price_rules(id,productId,fromQty,toQty,price) VALUES(?,?,?,?,?)', [uid(), id, r.from, r.to, r.price]))
  res.json({ id })
})

// Scan mock
app.post('/api/scan', upload.single('image'), (_req, res) => {
  const all = dbApi.all<any>('SELECT id, sku, name FROM products LIMIT 5')
  const out = all.slice(0,3).map((p,idx)=>({ id:p.id, sku:p.sku, name:p.name, quantity: idx+1, confidence: 90 - idx*10 }))
  res.json({ products: out })
})

// Tickets: confirm sale and decrement stock (by warehouse name or id)
app.post('/api/tickets', auth, (req, res) => {
  const schema = z.object({ id: z.string(), vendor: z.string(), warehouse: z.string(), photo: z.string().optional(), items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().positive() })) })
  const b = schema.parse(req.body)
  const wh = dbApi.get<any>('SELECT id,name FROM warehouses WHERE id = ? OR name = ?', [b.warehouse, b.warehouse])
  if (!wh) return res.status(400).json({ error: 'Depósito inválido' })
  const txn = () => dbApi.transaction(() => {
    for (const it of b.items) {
      const prod = dbApi.get<any>('SELECT id FROM products WHERE sku = ?', [it.sku])
      if (!prod) throw new Error(`Producto no encontrado: ${it.sku}`)
      const st = dbApi.get<any>('SELECT quantity FROM stock_levels WHERE productId = ? AND warehouseId = ?', [prod.id, wh.id]) as any
      const qty = st?.quantity ?? 0
      if (qty < it.quantity) throw new Error(`Stock insuficiente para ${it.sku}`)
    }
    for (const it of b.items) {
      const prod = dbApi.get<any>('SELECT id FROM products WHERE sku = ?', [it.sku])
      dbApi.run('UPDATE stock_levels SET quantity = quantity - ? WHERE productId = ? AND warehouseId = ?', [it.quantity, prod!.id, wh.id])
    }
    const now = new Date()
    dbApi.run('INSERT INTO tickets(id,date,time,vendor,warehouse,total,status,photo) VALUES(?,?,?,?,?,?,?,?)', [b.id, now.toISOString().slice(0,10), now.toTimeString().slice(0,5), b.vendor, wh.name, b.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0), 'confirmada', b.photo||null])
    b.items.forEach(i => dbApi.run('INSERT INTO ticket_items(id,ticketId,name,sku,quantity,unitPrice,subtotal) VALUES(?,?,?,?,?,?,?)', [uid(), b.id, i.sku, i.sku, i.quantity, i.unitPrice, i.quantity*i.unitPrice]))
  })
  try { txn(); res.json({ ok: true }) } catch(e:any){ res.status(400).json({ error: e.message }) }
})

app.get('/api/tickets', auth, (_req,res)=>{
  const list = dbApi.all<any>('SELECT * FROM tickets ORDER BY rowid DESC')
  res.json(list)
})

app.get('/api/health', (_req,res)=>res.json({ ok:true }))

app.listen(PORT, ()=> console.log(`server-lite on http://localhost:${PORT}`))

