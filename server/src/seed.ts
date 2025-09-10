import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', role: Role.ADMIN, password: bcrypt.hashSync('admin123', 8) }
  })

  const wh1 = await prisma.warehouse.upsert({ where: { name: 'Deposito Central' }, update: {}, create: { name: 'Deposito Central' } })
  const wh2 = await prisma.warehouse.upsert({ where: { name: 'Deposito Norte' }, update: {}, create: { name: 'Deposito Norte' } })

  const p1 = await prisma.product.upsert({
    where: { sku: 'AOL-500' }, update: {},
    create: {
      name: 'Aceite de Oliva Extra Virgen 500ml', sku: 'AOL-500', category: 'Aceites', description: '', basePrice: 8.5,
      images: { create: [{ url: '/placeholder.svg' }] },
      priceRules: { create: [{ fromQty: 1, toQty: 9, price: 8.5 }, { fromQty: 10, toQty: 49, price: 7.8 }, { fromQty: 50, toQty: 999, price: 7.2 }] },
    }
  })
  const p2 = await prisma.product.upsert({
    where: { sku: 'ARR-1000' }, update: {},
    create: {
      name: 'Arroz Integral 1kg', sku: 'ARR-1000', category: 'Granos', description: '', basePrice: 3.2,
      images: { create: [{ url: '/placeholder.svg' }] },
      priceRules: { create: [{ fromQty: 1, toQty: 19, price: 3.2 }, { fromQty: 20, toQty: 99, price: 2.9 }] },
    }
  })

  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: p1.id, warehouseId: wh1.id } },
    update: { quantity: 45 },
    create: { productId: p1.id, warehouseId: wh1.id, quantity: 45 }
  })
  await prisma.stockLevel.upsert({
    where: { productId_warehouseId: { productId: p2.id, warehouseId: wh1.id } },
    update: { quantity: 23 },
    create: { productId: p2.id, warehouseId: wh1.id, quantity: 23 }
  })

  console.log('Seed done:', { admin: admin.email, warehouses: [wh1.name, wh2.name] })
}

main().finally(() => prisma.$disconnect())

