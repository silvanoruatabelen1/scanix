import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus,
  Upload,
  X,
  DollarSign,
  Minus
} from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

interface PriceRule {
  from: number;
  to: number;
  price: number;
}

export default function AddProductModal({ isOpen, onClose, onProductAdded }: AddProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    tags: [] as string[],
    basePrice: ""
  });
  const [priceRules, setPriceRules] = useState<PriceRule[]>([
    { from: 1, to: 9, price: 0 }
  ]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const categories = ["Aceites", "Granos", "Pastas", "Conservas", "Lácteos", "Bebidas"];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddPriceRule = () => {
    setPriceRules(prev => [
      ...prev,
      { from: 0, to: 0, price: 0 }
    ]);
  };

  const handleRemovePriceRule = (index: number) => {
    setPriceRules(prev => prev.filter((_, i) => i !== index));
  };

  const handlePriceRuleChange = (index: number, field: keyof PriceRule, value: number) => {
    setPriceRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (images.length >= 5) {
        toast({
          title: "Límite alcanzado",
          description: "Máximo 5 imágenes por producto",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Validaciones básicas
    if (!formData.name || !formData.sku || !formData.category) {
      toast({
        title: "Campos requeridos",
        description: "Completa nombre, SKU y categoría",
        variant: "destructive"
      });
      return;
    }

    // Simular guardado
    console.log("Guardando producto:", { formData, priceRules, images });
    
    toast({
      title: "Producto agregado",
      description: `${formData.name} se agregó exitosamente`,
    });

    onProductAdded();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      description: "",
      tags: [],
      basePrice: ""
    });
    setPriceRules([{ from: 1, to: 9, price: 0 }]);
    setTagInput("");
    setImages([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Producto
          </DialogTitle>
          <DialogDescription>
            Completa la información del nuevo producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Aceite de Oliva Extra Virgen..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="AOL-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Precio Base</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => handleInputChange("basePrice", e.target.value)}
                placeholder="8.50"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción del producto..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Agregar etiqueta..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button type="button" onClick={handleAddTag}>
                Agregar
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Price Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Reglas de Precio por Cantidad</Label>
              <Button variant="outline" size="sm" onClick={handleAddPriceRule}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Regla
              </Button>
            </div>

            <div className="space-y-3">
              {priceRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div>
                      <Label className="text-xs">Desde</Label>
                      <Input
                        type="number"
                        value={rule.from}
                        onChange={(e) => handlePriceRuleChange(index, "from", parseInt(e.target.value) || 0)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="number"
                        value={rule.to}
                        onChange={(e) => handlePriceRuleChange(index, "to", parseInt(e.target.value) || 0)}
                        placeholder="9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Precio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rule.price}
                        onChange={(e) => handlePriceRuleChange(index, "price", parseFloat(e.target.value) || 0)}
                        placeholder="8.50"
                      />
                    </div>
                  </div>
                  {priceRules.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePriceRule(index)}
                      className="text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imágenes (máximo 5)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para subir imágenes o arrastra aquí
                  </p>
                </div>
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Guardar Producto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}