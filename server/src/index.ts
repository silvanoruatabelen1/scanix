import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const app = express()
const prisma = new PrismaClient()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Auth middleware (simple)
function auth(req: any, res: any, next: any) {
  const h = req.headers.authorization
  if (!h) return res.status(401).json({ error: 'No token' })
  const token = h.replace('Bearer ', '')
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(4) })
  const body = schema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
  const ok = bcrypt.compareSync(body.password, user.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
})

// Products CRUD
app.get('/api/products', async (_req, res) => {
  const list = await prisma.product.findMany({ include: { priceRules: true, images: true, stocks: true } })
  res.json(list)
})

app.post('/api/products', auth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    tags: z.array(z.string()).optional(),
    images: z.array(z.string()).default([]),
    priceRules: z.array(z.object({ from: z.number().int().positive(), to: z.number().int().positive(), price: z.number().positive() })).default([]),
    stockByWarehouse: z.array(z.object({ warehouseId: z.string(), quantity: z.number().int().nonnegative() })).optional()
  })
  const body = schema.parse(req.body)
  // validate unique SKU
  const exists = await prisma.product.findUnique({ where: { sku: body.sku } })
  if (exists) return res.status(400).json({ error: 'SKU duplicado' })
  // validate non overlapping rules
  const rules = [...body.priceRules].sort((a, b) => a.from - b.from)
  for (let i = 1; i < rules.length; i++) if (rules[i].from <= rules[i - 1].to) return res.status(400).json({ error: 'Reglas solapadas' })

  const created = await prisma.product.create({
    data: {
      name: body.name,
      sku: body.sku,
      category: body.category,
      description: body.description || '',
      basePrice: body.price,
      images: { create: body.images.map((url) => ({ url })) },
      priceRules: { create: body.priceRules.map(r => ({ fromQty: r.from, toQty: r.to, price: r.price })) },
    }
  })
  res.json(created)
})

// Scan (mock): returns random recognized SKUs based on catalog
app.post('/api/scan', upload.single('image'), async (_req, res) => {
  const all = await prisma.product.findMany()
  const out = all.slice(0, Math.min(3, all.length)).map((p, idx) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    quantity: idx + 1,
    confidence: 80 - idx * 10,
  }))
  res.json({ products: out })
})

// Tickets: create and decrement stock transactionally
app.post('/api/tickets', auth, async (req, res) => {
  const schema = z.object({
    id: z.string(),
    vendor: z.string(),
    warehouseId: z.string(),
    photo: z.string().optional(),
    items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().positive() }))
  })
  const body = schema.parse(req.body)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // check stock
      for (const it of body.items) {
        const prod = await tx.product.findUnique({ where: { sku: it.sku } })
        if (!prod) throw new Error(`Producto no encontrado: ${it.sku}`)
        const stock = await tx.stockLevel.findUnique({ where: { productId_warehouseId: { productId: prod.id, warehouseId: body.warehouseId } } })
        const qty = stock?.quantity || 0
        if (qty < it.quantity) throw new Error(`Stock insuficiente para ${it.sku}`)
      }
      // decrement
      for (const it of body.items) {
        const prod = await tx.product.findUnique({ where: { sku: it.sku } })
        await tx.stockLevel.update({
          where: { productId_warehouseId: { productId: prod!.id, warehouseId: body.warehouseId } },
          data: { quantity: { decrement: it.quantity } }
        })
      }
      const now = new Date()
      const ticket = await tx.ticket.create({
        data: {
          id: body.id,
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 5),
          vendor: body.vendor,
          warehouse: body.warehouseId,
          total: body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
          status: 'confirmada',
          photo: body.photo,
          items: { create: body.items.map(i => ({ name: i.sku, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.quantity * i.unitPrice })) }
        }
      })
      return ticket
    })
    res.json({ ok: true, ticket: result })
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo generar el ticket' })
  }
})

app.get('/api/tickets', auth, async (_req, res) => {
  const list = await prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, include: { items: true } })
  res.json(list)
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

