import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Truck, Download, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  cost: number;
  is_service: boolean;
}

interface RestockOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  supplier_contact: string;
  order_date: string;
  received_date?: string;
  status: string;
  total_cost: number;
  notes?: string;
}

interface RestockItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

const Restock = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([{ product_id: '', quantity: 1, unit_cost: 0, total_cost: 0 }]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch restock orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('restock_orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setRestockOrders(ordersData || []);

      // Fetch products (only physical products, not services)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, cost, is_service')
        .eq('user_id', user!.id)
        .eq('is_service', false);

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `RO-${timestamp}`;
  };

  const addRestockItem = () => {
    setRestockItems([...restockItems, { product_id: '', quantity: 1, unit_cost: 0, total_cost: 0 }]);
  };

  const removeRestockItem = (index: number) => {
    if (restockItems.length > 1) {
      setRestockItems(restockItems.filter((_, i) => i !== index));
    }
  };

  const updateRestockItem = (index: number, field: string, value: any) => {
    const updatedItems = [...restockItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].unit_cost = product.cost || 0;
        updatedItems[index].total_cost = (product.cost || 0) * updatedItems[index].quantity;
      }
    } else if (field === 'quantity' || field === 'unit_cost') {
      updatedItems[index].total_cost = updatedItems[index].quantity * updatedItems[index].unit_cost;
    }
    
    setRestockItems(updatedItems);
  };

  const calculateTotal = () => {
    return restockItems.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const handleCreateRestockOrder = async () => {
    if (restockItems.some(item => !item.product_id || item.quantity <= 0)) {
      toast({
        title: "Invalid restock items",
        description: "Please fill all product details and quantities",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderNumber = generateOrderNumber();
      const totalCost = calculateTotal();

      // Create restock order
      const { data: orderData, error: orderError } = await supabase
        .from('restock_orders')
        .insert([{
          user_id: user!.id,
          order_number: orderNumber,
          supplier_name: supplierName,
          supplier_contact: supplierContact,
          total_cost: totalCost,
          notes: notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create restock items
      const restockItemsData = restockItems.map(item => ({
        restock_order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost
      }));

      const { error: itemsError } = await supabase
        .from('restock_items')
        .insert(restockItemsData);

      if (itemsError) throw itemsError;

      toast({ title: "Restock order created successfully" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating restock order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    try {
      // Get the restock items for this order
      const { data: items, error: itemsError } = await supabase
        .from('restock_items')
        .select('*')
        .eq('restock_order_id', orderId);

      if (itemsError) throw itemsError;

      // Update product stock quantities
      for (const item of items || []) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const newQuantity = product.stock_quantity + item.quantity;
          await supabase
            .from('products')
            .update({ stock_quantity: newQuantity })
            .eq('id', item.product_id);

          // Create stock transaction record
          await supabase
            .from('stock_transactions')
            .insert({
              user_id: user!.id,
              product_id: item.product_id,
              transaction_type: 'restock',
              quantity_change: item.quantity,
              quantity_before: product.stock_quantity,
              quantity_after: newQuantity,
              unit_cost: item.unit_cost,
              total_cost: item.total_cost,
              reference_id: orderId,
              notes: `Restock order received`
            });
        }
      }

      // Update order status
      await supabase
        .from('restock_orders')
        .update({ 
          status: 'received',
          received_date: new Date().toISOString()
        })
        .eq('id', orderId);

      toast({ title: "Restock order received successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error receiving order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this restock order?')) return;

    try {
      await supabase.from('restock_orders').delete().eq('id', orderId);
      toast({ title: "Restock order deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportRestockData = () => {
    const csvData = restockOrders.map(order => ({
      'Order Number': order.order_number,
      'Supplier': order.supplier_name,
      'Contact': order.supplier_contact,
      'Order Date': new Date(order.order_date).toLocaleDateString(),
      'Received Date': order.received_date ? new Date(order.received_date).toLocaleDateString() : '',
      'Status': order.status,
      'Total Cost': order.total_cost,
      'Notes': order.notes || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setRestockItems([{ product_id: '', quantity: 1, unit_cost: 0, total_cost: 0 }]);
    setSupplierName('');
    setSupplierContact('');
    setNotes('');
  };

  if (loading) {
    return <div>Loading restock orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Restock</h1>
          <p className="text-muted-foreground">Manage product restocking and supplier orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRestockData} disabled={restockOrders.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Orders
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Restock Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Restock Order</DialogTitle>
                <DialogDescription>Order products from suppliers</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Supplier Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier Name</Label>
                    <Input
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier Contact</Label>
                    <Input
                      value={supplierContact}
                      onChange={(e) => setSupplierContact(e.target.value)}
                      placeholder="Phone or email"
                    />
                  </div>
                </div>

                {/* Restock Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Products to Restock</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addRestockItem}>
                      Add Item
                    </Button>
                  </div>
                  
                  {restockItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select 
                          value={item.product_id} 
                          onValueChange={(value) => updateRestockItem(index, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (Current Stock: {product.stock_quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateRestockItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Unit Cost"
                          value={item.unit_cost}
                          onChange={(e) => updateRestockItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={`$${item.total_cost.toFixed(2)}`}
                          disabled
                        />
                      </div>
                      <div className="col-span-1">
                        {restockItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRestockItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this order"
                  />
                </div>

                {/* Total */}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Cost:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handleCreateRestockOrder} className="w-full">
                  Create Restock Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Restock Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Restock Orders</CardTitle>
          <CardDescription>Track inventory restocking orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.supplier_name}</TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.received_date ? new Date(order.received_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>${order.total_cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'received' ? 'default' :
                      order.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReceiveOrder(order.id)}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {restockOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No restock orders found. Create your first restock order to get started.
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Restock Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Restock;