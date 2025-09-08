import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Package, 
  Edit, 
  Trash2,
  Filter,
  DollarSign
} from "lucide-react";
import Layout from "@/components/Layout";
import AddProductModal from "@/components/modals/AddProductModal";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  image: string;
  tags: string[];
  priceRules: {
    from: number;
    to: number;
    price: number;
  }[];
}

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  // Mock data
  const categories = ["Todos", "Aceites", "Granos", "Pastas", "Conservas"];
  
  const products: Product[] = [
    {
      id: "1",
      name: "Aceite de Oliva Extra Virgen 500ml",
      sku: "AOL-500",
      category: "Aceites",
      stock: 45,
      price: 8.50,
      image: "/placeholder.svg",
      tags: ["premium", "importado", "500ml"],
      priceRules: [
        { from: 1, to: 9, price: 8.50 },
        { from: 10, to: 49, price: 7.80 },
        { from: 50, to: 999, price: 7.20 }
      ]
    },
    {
      id: "2",
      name: "Arroz Integral 1kg",
      sku: "ARR-1000",
      category: "Granos",
      stock: 23,
      price: 3.20,
      image: "/placeholder.svg",
      tags: ["integral", "1kg", "saludable"],
      priceRules: [
        { from: 1, to: 19, price: 3.20 },
        { from: 20, to: 99, price: 2.90 }
      ]
    },
    {
      id: "3",
      name: "Pasta Italiana 500g",
      sku: "PAS-500",
      category: "Pastas",
      stock: 8,
      price: 2.90,
      image: "/placeholder.svg",
      tags: ["italiana", "500g", "premium"],
      priceRules: [
        { from: 1, to: 9, price: 2.90 },
        { from: 10, to: 49, price: 2.60 }
      ]
    }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (stock: number) => {
    if (stock <= 10) return { color: "destructive", text: "Bajo" };
    if (stock <= 25) return { color: "warning", text: "Medio" };
    return { color: "success", text: "Alto" };
  };

  const handleAddProduct = () => {
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    toast({
      title: "Editar producto",
      description: "Funcionalidad en desarrollo",
    });
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    // Aquí se podría mostrar un modal de confirmación
    toast({
      title: "Producto eliminado",
      description: `${productName} ha sido eliminado del catálogo`,
      variant: "destructive"
    });
  };

  const handleMoreFilters = () => {
    toast({
      title: "Más filtros",
      description: "Panel de filtros avanzados en desarrollo",
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    toast({
      title: "Filtros limpiados",
      description: "Se han restablecido todos los filtros",
    });
  };

  const handleProductAdded = () => {
    setRefreshKey(prev => prev + 1);
    // Aquí se podría recargar la lista de productos desde la API
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catálogo de Productos</h1>
            <p className="text-muted-foreground">
              Gestiona tu inventario de productos y precios
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddProduct}>
            <Plus className="h-4 w-4" />
            Agregar Producto
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={handleMoreFilters}>
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock);
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={stockStatus.color as any}>
                      Stock: {stockStatus.text}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight truncate">
                        {product.name}
                      </CardTitle>
                      <CardDescription>
                        SKU: {product.sku} • {product.category}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Stock and Price */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Stock: {product.stock} unidades
                      </span>
                      <div className="flex items-center gap-1 text-lg font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {product.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {product.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Price Rules Summary oculto */}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleEditProduct(product.id)}
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground mb-4">
                  Intenta ajustar los criterios de búsqueda
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={handleProductAdded}
      />
    </Layout>
  );
}
