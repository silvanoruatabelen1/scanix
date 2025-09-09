import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt,
  Download,
  Printer,
  Mail,
  MessageSquare,
  Check,
  User,
  Calendar,
  Warehouse
} from "lucide-react";
import { add as addTicket } from "@/store/tickets";

interface PriceRule { from: number; to: number; price: number }

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number; // precio base
    priceRules?: PriceRule[]; // opcional: reglas por cantidad
  }>;
  photo?: string | null; // miniatura de la captura
  onTicketGenerated: () => void;
}

export default function TicketModal({ isOpen, onClose, products, photo, onTicketGenerated }: TicketModalProps) {
  const { toast } = useToast();
  const [ticketData, setTicketData] = useState({
    vendor: "Operario Demo",
    warehouse: "Depósito Central",
    customerEmail: "",
    customerPhone: ""
  });

  const generateTicketId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VTA-${year}${month}${day}-${random}`;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const calculateTotal = () => {
    return products.reduce((total, product) => {
      const unitPrice = getUnitPrice(product.quantity, product.price, product.priceRules);
      return total + (product.quantity * unitPrice);
    }, 0);
  };

  const handleConfirmSale = () => {
    const ticketId = generateTicketId();
    
    // Simular confirmación de venta
    console.log("Confirmando venta:", {
      ticketId,
      ...ticketData,
      products,
      total: calculateTotal(),
      timestamp: new Date().toISOString()
    });

    toast({
      title: "Venta confirmada",
      description: `Ticket ${ticketId} generado exitosamente`,
    });

    onTicketGenerated();
    onClose();
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Descargando PDF",
      description: "El archivo se descargará en breve",
    });
  };

  const handlePrint = () => {
    toast({
      title: "Enviando a impresora",
      description: "El ticket se está imprimiendo",
    });
  };

  const getUnitPrice = (qty: number, basePrice: number, rules?: PriceRule[]) => {
    if (!rules || rules.length === 0) return basePrice;
    const rule = rules.find(r => qty >= r.from && qty <= r.to);
    return rule ? rule.price : basePrice;
  };

  // Nueva confirmación: persiste ticket en Local Storage
  const handleConfirmSalePersist = () => {
    const ticketId = generateTicketId();
    const items = products.map((p) => {
      const unit = getUnitPrice(p.quantity, p.price, p.priceRules);
      const rule = p.priceRules?.find(r => p.quantity >= r.from && p.quantity <= r.to) || null;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        unitPrice: unit,
        ruleApplied: rule ? { from: rule.from, to: rule.to } : null,
        subtotal: +(p.quantity * unit).toFixed(2),
      };
    });

    const now = new Date();
    addTicket({
      id: ticketId,
      date: now.toISOString().slice(0,10),
      time: now.toTimeString().slice(0,5),
      vendor: ticketData.vendor,
      warehouse: ticketData.warehouse,
      total: +calculateTotal().toFixed(2),
      status: "confirmada",
      items,
      photo: photo,
    });

    toast({ title: "Venta confirmada", description: `Ticket ${ticketId} generado exitosamente` });
    onTicketGenerated();
    onClose();
  };

  const handleSendEmail = () => {
    if (!ticketData.customerEmail) {
      toast({
        title: "Email requerido",
        description: "Ingresa el email del cliente",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Email enviado",
      description: `Ticket enviado a ${ticketData.customerEmail}`,
    });
  };

  const handleSendWhatsApp = () => {
    if (!ticketData.customerPhone) {
      toast({
        title: "Teléfono requerido",
        description: "Ingresa el teléfono del cliente",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "WhatsApp enviado",
      description: `Ticket enviado a ${ticketData.customerPhone}`,
    });
  };

  const ticketId = generateTicketId();
  const dateTime = getCurrentDateTime();
  const total = calculateTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Generar Ticket de Venta
          </DialogTitle>
          <DialogDescription>
            Revisa los detalles antes de confirmar la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Preview */}
          <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">SCANIX</h3>
              <p className="text-xs">Sistema de Ventas</p>
            </div>

            <Separator className="my-3" />

            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                <span>ID: {ticketId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{dateTime.date} {dateTime.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{ticketData.vendor}</span>
              </div>
              <div className="flex items-center gap-1">
                <Warehouse className="h-3 w-3" />
                <span>{ticketData.warehouse}</span>
              </div>
            </div>

            {photo && (
              <div className="mb-3 flex justify-center">
                <img src={photo} alt="Foto del escaneo" className="h-20 w-20 object-cover rounded border" />
              </div>
            )}

            <Separator className="my-3" />

            {/* Products */}
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <span>Producto</span>
                <span className="text-center">Cant</span>
                <span className="text-right">P.Unit</span>
                <span className="text-right">Total</span>
              </div>
              
              {products.map((product) => {
                const unit = getUnitPrice(product.quantity, product.price, product.priceRules);
                const rule = product.priceRules?.find(r => product.quantity >= r.from && product.quantity <= r.to);
                return (
                  <div key={product.id} className="space-y-1">
                    <div className="text-xs truncate">{product.name}</div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <span className="text-muted-foreground">{product.sku}</span>
                      <span className="text-center">{product.quantity}</span>
                      <span className="text-right">${unit.toFixed(2)}</span>
                      <span className="text-right font-semibold">
                        ${(product.quantity * unit).toFixed(2)}
                      </span>
                    </div>
                    {rule && (
                      <div className="text-[10px] text-muted-foreground">Regla aplicada: {rule.from}-{rule.to}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-3" />

            <div className="text-right font-bold">
              TOTAL: ${total.toFixed(2)}
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del Cliente (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={ticketData.customerEmail}
                onChange={(e) => setTicketData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                value={ticketData.customerPhone}
                onChange={(e) => setTicketData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="+54 11 1234 5678"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendEmail} className="gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendWhatsApp} className="gap-1">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirmSalePersist} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Confirmar Venta
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
