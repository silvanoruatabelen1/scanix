export interface PriceRule { from: number; to: number; price: number }
export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  tags: string[];
  price: number; // base price
  images: string[]; // data URLs o URLs
  priceRules: PriceRule[];
}

const KEY = "scanix_catalog_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): CatalogProduct[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed inicial (mocks actuales)
  const seed: CatalogProduct[] = [
    {
      id: "1",
      name: "Aceite de Oliva Extra Virgen 500ml",
      sku: "AOL-500",
      category: "Aceites",
      description: "",
      tags: ["premium", "importado", "500ml"],
      price: 8.5,
      images: ["/placeholder.svg"],
      priceRules: [
        { from: 1, to: 9, price: 8.5 },
        { from: 10, to: 49, price: 7.8 },
        { from: 50, to: 999, price: 7.2 },
      ],
    },
    {
      id: "2",
      name: "Arroz Integral 1kg",
      sku: "ARR-1000",
      category: "Granos",
      description: "",
      tags: ["integral", "1kg", "saludable"],
      price: 3.2,
      images: ["/placeholder.svg"],
      priceRules: [
        { from: 1, to: 19, price: 3.2 },
        { from: 20, to: 99, price: 2.9 },
      ],
    },
    {
      id: "3",
      name: "Pasta Italiana 500g",
      sku: "PAS-500",
      category: "Pastas",
      description: "",
      tags: ["italiana", "500g", "premium"],
      price: 2.9,
      images: ["/placeholder.svg"],
      priceRules: [
        { from: 1, to: 9, price: 2.9 },
        { from: 10, to: 49, price: 2.6 },
      ],
    },
  ];
  save(seed);
  return seed;
}

function save(data: CatalogProduct[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAll(): CatalogProduct[] {
  return load();
}

export function findBySku(sku: string): CatalogProduct | undefined {
  return load().find(p => p.sku.toLowerCase() === sku.toLowerCase());
}

export function validatePriceRules(rules: PriceRule[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const r of rules) {
    if (r.from <= 0 || r.to <= 0) errors.push("Los rangos deben ser positivos");
    if (r.from > r.to) errors.push("Desde no puede ser mayor que Hasta");
    if (r.price <= 0) errors.push("El precio debe ser mayor a 0");
  }
  const sorted = [...rules].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.from <= prev.to) errors.push("Las reglas no deben solaparse");
  }
  return { ok: errors.length === 0, errors };
}

export function addProduct(input: Omit<CatalogProduct, "id">) {
  const data = load();
  if (data.some(p => p.sku.toLowerCase() === input.sku.toLowerCase())) {
    throw new Error("SKU duplicado");
  }
  const { ok, errors } = validatePriceRules(input.priceRules || []);
  if (!ok) throw new Error(errors.join("; "));
  const product: CatalogProduct = { ...input, id: uid() };
  data.push(product);
  save(data);
  return product;
}

export function updateProduct(id: string, updates: Partial<Omit<CatalogProduct, "id">>) {
  const data = load();
  const idx = data.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Producto no encontrado");
  if (updates.sku && updates.sku.toLowerCase() !== data[idx].sku.toLowerCase()) {
    if (data.some(p => p.sku.toLowerCase() === updates.sku!.toLowerCase())) {
      throw new Error("SKU duplicado");
    }
  }
  if (updates.priceRules) {
    const { ok, errors } = validatePriceRules(updates.priceRules);
    if (!ok) throw new Error(errors.join("; "));
  }
  data[idx] = { ...data[idx], ...updates } as CatalogProduct;
  save(data);
  return data[idx];
}

export function removeProduct(id: string) {
  const data = load().filter(p => p.id !== id);
  save(data);
}

