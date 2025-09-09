export interface TicketItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  ruleApplied?: { from: number; to: number } | null;
  subtotal: number;
}

export interface TicketRecord {
  id: string; // VTA-*
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  vendor: string;
  warehouse: string;
  total: number;
  status: "confirmada" | "pendiente" | "anulada";
  items: TicketItem[];
  photo?: string | null;
}

const KEY = "scanix_tickets_v1";

function load(): TicketRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: TicketRecord[] = [];
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function save(data: TicketRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAll(): TicketRecord[] { return load(); }

export function getById(id: string): TicketRecord | undefined {
  return load().find(t => t.id === id);
}

export function add(ticket: TicketRecord) {
  const data = load();
  data.unshift(ticket); // más reciente primero
  save(data);
}

