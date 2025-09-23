import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, AlertTriangle, X, Download } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
  is_service: boolean;
  product_type: string;
}

const Products = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isService = formData.get('product_type') === 'service';
    
    const productData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      barcode: formData.get('barcode') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      cost: parseFloat(formData.get('cost') as string),
      stock_quantity: isService ? 0 : parseInt(formData.get('stock_quantity') as string),
      low_stock_threshold: isService ? 0 : parseInt(formData.get('low_stock_threshold') as string),
      category: formData.get('category') as string,
      product_type: formData.get('product_type') as string || 'product',
      is_service: isService,
      user_id: user!.id,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        
        if (error) throw error;
        toast({ title: "Product added successfully" });
      }
      
      setDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error saving product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Product deleted successfully" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDialog = (product?: Product) => {
    setEditingProduct(product || null);
    setDialogOpen(true);
  };

  const exportProductsData = () => {
    const csvData = products.map(product => ({
      'Product Name': product.name,
      'Type': product.is_service ? 'Service' : 'Product',
      'Category': product.category,
      'SKU': product.sku || '',
      'Barcode': product.barcode || '',
      'Price': product.price,
      'Cost': product.cost,
      'Stock Quantity': product.is_service ? 'N/A' : product.stock_quantity,
      'Low Stock Alert': product.is_service ? 'N/A' : product.low_stock_threshold,
      'Description': product.description || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground">Manage your inventory and services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportProductsData} disabled={products.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Products
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product/Service
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product/Service' : 'Add New Product/Service'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update product or service information' : 'Enter details to add to inventory'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_type">Type</Label>
                  <Select name="product_type" defaultValue={editingProduct?.product_type || 'product'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Physical Product</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editingProduct?.category}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={editingProduct?.sku}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    defaultValue={editingProduct?.barcode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.price}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.cost}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    defaultValue={editingProduct?.stock_quantity}
                    placeholder="Not applicable for services"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                  <Input
                    id="low_stock_threshold"
                    name="low_stock_threshold"
                    type="number"
                    defaultValue={editingProduct?.low_stock_threshold || 5}
                    placeholder="Not applicable for services"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingProduct?.description}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? 'Update Product/Service' : 'Add Product/Service'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant={product.is_service ? "secondary" : "default"}>
                      {product.is_service ? 'Service' : 'Product'}
                    </Badge>
                  </div>
                  <CardDescription>{product.category}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openDialog(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">${product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span>${product.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={`font-medium ${
                    !product.is_service && product.stock_quantity <= product.low_stock_threshold 
                      ? 'text-destructive' 
                      : 'text-foreground'
                  }`}>
                    {product.is_service ? 'Unlimited' : product.stock_quantity}
                    {!product.is_service && product.stock_quantity <= product.low_stock_threshold && (
                      <AlertTriangle className="inline h-3 w-3 ml-1" />
                    )}
                  </span>
                </div>
                {product.sku && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU:</span>
                    <span>{product.sku}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No products or services found. Add your first product or service to get started.
            </p>
            <Button className="mt-4" onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Product/Service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Products;