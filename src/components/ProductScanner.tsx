import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as CatalogStore from "@/store/catalog";
import { 
  Camera, 
  Upload, 
  Loader2, 
  Package, 
  Plus, 
  Minus, 
  X,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Trash2,
  RotateCcw
} from "lucide-react";
import heroImage from "@/assets/hero-scanning.jpg";
import TicketModal from "@/components/modals/TicketModal";

interface DetectedProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  confidence: number;
  image: string;
  price: number;
}

export default function ProductScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const [isAddFromCatalogOpen, setIsAddFromCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");

  // Precios por cantidad desde cat�logo
  const getUnitPriceBySku = (qty: number, sku: string, fallback: number) => {
    return (() => {
      try {
        const p = require("@/store/catalog");
        const prod = p.findBySku ? p.findBySku(sku) : undefined;
        if (!prod || !prod.priceRules?.length) return fallback;
        const r = prod.priceRules.find((r: any) => qty >= r.from && qty <= r.to);
        return r ? r.price : fallback;
      } catch { return fallback; }
    })();
  };


  const getConfidenceThreshold = () => {
    const v = localStorage.getItem("scanix_conf_threshold");
    const n = v ? parseInt(v) : 60;
    return isNaN(n) ? 60 : n;
  };

  // Mock detected products for demo
  const mockProducts: DetectedProduct[] = [
    {
      id: "1",
      name: "Aceite de Oliva Extra Virgen 500ml",
      sku: "AOL-500",
      quantity: 3,
      confidence: 95,
      image: "/placeholder.svg",
      price: 8.50
    },
    {
      id: "2", 
      name: "Arroz Integral 1kg",
      sku: "ARR-1000",
      quantity: 2,
      confidence: 87,
      image: "/placeholder.svg", 
      price: 3.20
    },
    {
      id: "3",
      name: "Pasta Italiana 500g",
      sku: "PAS-500",
      quantity: 1,
      confidence: 45,
      image: "/placeholder.svg",
      price: 2.90
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo inválido",
        description: "Solo se permiten archivos JPG y PNG",
        variant: "destructive"
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo permitido es 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      processImage();
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    setIsScanning(true);
    setDetectedProducts([]);

    // Simulate AI processing with delay
    scanTimeoutRef.current = window.setTimeout(() => {
      const merged = mergeBySku(mockProducts);
      setDetectedProducts(merged);
      setIsScanning(false);
      scanTimeoutRef.current = null;
      toast({
        title: "Escaneo completado",
        description: `Se detectaron ${merged.length} productos`,
      });
    }, 3000);
  };

  const mergeBySku = (items: DetectedProduct[]) => {
    const map = new Map<string, DetectedProduct>();
    for (const p of items) {
      const existing = map.get(p.sku);
      if (existing) {
        map.set(p.sku, { ...existing, quantity: existing.quantity + p.quantity, confidence: Math.max(existing.confidence, p.confidence) });
      } else {
        map.set(p.sku, { ...p });
      }
    }
    return Array.from(map.values());
  };

  // Inicia la cámara para escritorio
  const startDesktopCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "No se pudo acceder a la cámara",
        description: "Revisa los permisos del navegador o conecta una cámara.",
        variant: "destructive",
      });
      setIsCameraModalOpen(false);
    }
  };

  const stopDesktopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isCameraModalOpen) startDesktopCamera();
    else stopDesktopCamera();
    return () => stopDesktopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraModalOpen]);

  const captureDesktopPhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    setSelectedImage(dataUrl);
    setIsCameraModalOpen(false);
    processImage();
  };

  // Helpers para gestionar imagen seleccionada y reintento
  const openCameraByDevice = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      setIsCameraModalOpen(true);
    }
  };

  const handleRemoveSelected = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);
    setDetectedProducts([]);
    setSelectedImage(null);
  };

  const handleRetake = () => {
    // No limpiamos la imagen ni resultados hasta confirmar nueva captura
    openCameraByDevice();
  };

  const addFromCatalog = (sku: string) => {
    try {
      const p = CatalogStore.findBySku(sku);
      if (!p) return;
      const image = (p.images && p.images[0]) || "/placeholder.svg";
      setDetectedProducts(prev => (
        mergeBySku([
          ...prev,
          { id: p.id, name: p.name, sku: p.sku, quantity: 1, confidence: 100, image, price: p.price }
        ])
      ));
      setIsAddFromCatalogOpen(false);
    } catch (e) { console.error(e); }
  };

  const updateQuantity = (productId: string, change: number) => {
    setDetectedProducts(products =>
      products.map(product =>
        product.id === productId
          ? { ...product, quantity: Math.max(0, product.quantity + change) }
          : product
      ).filter(product => product.quantity > 0)
    );
  };

  const removeProduct = (productId: string) => {
    setDetectedProducts(products =>
      products.filter(product => product.id !== productId)
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "success";
    if (confidence >= 60) return "warning";
    return "destructive";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return CheckCircle;
    if (confidence >= 60) return AlertTriangle;
    return AlertTriangle;
  };

  const getTotalAmount = () => {
    return detectedProducts.reduce((total, product) => { const unit = getUnitPriceBySku(product.quantity, product.sku, product.price); return total + (product.quantity * unit); }, 0).toFixed(2);
  };

  const handleGenerateOrder = () => {
    if (detectedProducts.length === 0) {
      toast({
        title: "No hay productos",
        description: "Escanea algunos productos primero",
        variant: "destructive"
      });
      return;
    }

    // Verificar si hay productos con baja confianza (umbral configurable)
    const threshold = getConfidenceThreshold();
    const lowConfidenceProducts = detectedProducts.filter(p => p.confidence < threshold);
    if (lowConfidenceProducts.length > 0) {
      toast({
        title: "Productos requieren confirmación",
        description: `${lowConfidenceProducts.length} productos tienen baja confianza`,
        variant: "destructive"
      });
      return;
    }

    setIsTicketModalOpen(true);
  };

  const handleOrderGenerated = () => {
    // Limpiar el scanner después de generar el pedido
    setDetectedProducts([]);
    setSelectedImage(null);
    
    toast({
      title: "¡Pedido generado!",
      description: "El pedido se ha procesado correctamente",
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-primary/10 to-primary/5">
          <img 
            src={heroImage} 
            alt="Scanning Interface" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Package className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Scaner de Productos
              </h2>
              <p className="text-muted-foreground">
                Identifica productos automáticamente con inteligencia artificial
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Scanning Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Capturar Imagen</CardTitle>
          <CardDescription>
            Toma una foto o sube una imagen para identificar productos automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={openCameraByDevice}
              disabled={isScanning}
            >
              <Camera className="h-8 w-8" />
              Tomar Foto
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              <Upload className="h-8 w-8" />
              Subir Archivo
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => setIsAddFromCatalogOpen(true)}
              disabled={isScanning}
            >
              <Plus className="h-8 w-8" />
              Agregar desde Catálogo
            </Button>
          </div>

          {/* Input dedicado para cámara (móviles): usa capture para abrir la cámara */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Input dedicado para subir archivo desde el sistema */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {selectedImage && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">Imagen seleccionada:</p>
              <img
                src={selectedImage}
                alt="Selected"
                className="max-w-xs h-32 object-cover rounded-lg border"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" onClick={handleRemoveSelected} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
                <Button variant="secondary" size="sm" onClick={handleRetake} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Volver a tomar
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> Subir otra
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing State */}
      {isScanning && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <h3 className="text-lg font-semibold">Procesando imagen...</h3>
              <p className="text-muted-foreground">
                Identificando productos con inteligencia artificial
              </p>
              <Progress value={75} className="w-full max-w-sm mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detection Results */}
      {detectedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Productos Detectados</CardTitle>
                <CardDescription>
                  {detectedProducts.length} productos identificados
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                Total: ${getTotalAmount()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectedProducts.map((product) => {
                const ConfidenceIcon = getConfidenceIcon(product.confidence);
                
                return (
                  <Card key={product.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg bg-muted"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {product.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku} • ${product.price}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <ConfidenceIcon className={`h-4 w-4 text-${getConfidenceColor(product.confidence)}`} />
                          <span className="text-xs text-muted-foreground">
                            Confianza: {product.confidence}%
                          </span>
                          {product.confidence < getConfidenceThreshold() && (
                            <Badge variant="destructive" className="text-xs">
                              Requiere confirmación
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <span className="w-12 text-center font-medium">
                          {product.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              <div className="flex justify-end pt-4">
                <Button size="lg" className="gap-2" onClick={handleGenerateOrder}>
                  <ShoppingCart className="h-5 w-5" />
                  Generar Pedido
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {/* Agregar desde catálogo */}
      <Dialog open={isAddFromCatalogOpen} onOpenChange={setIsAddFromCatalogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar desde catálogo</DialogTitle>
            <DialogDescription>Busca por nombre o SKU</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="Buscar por nombre o SKU..."
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {require("@/store/catalog").getAll()
                .filter((p: any) =>
                  p.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
                  p.sku.toLowerCase().includes(catalogQuery.toLowerCase())
                )
                .map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="text-sm">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted-foreground">{p.sku}</div>
                    </div>
                    <Button size="sm" onClick={() => addFromCatalog(p.sku)}>Agregar</Button>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de cámara para escritorio */}
      <Dialog open={isCameraModalOpen} onOpenChange={setIsCameraModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capturar desde cámara</DialogTitle>
            <DialogDescription>
              Acepta el permiso del navegador para acceder a la cámara.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video w-full bg-black/80 rounded-md overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className="w-full" playsInline muted />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCameraModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={captureDesktopPhoto} className="gap-2">
                <Camera className="h-4 w-4" /> Capturar
              </Button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </DialogContent>
      </Dialog>

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        photo={selectedImage}
        products={detectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.quantity,
          price: p.price,
          priceRules: (require("@/store/catalog").findBySku(p.sku)?.priceRules)
        }))}
        onTicketGenerated={handleOrderGenerated}
      />
    </div>
  );
}



