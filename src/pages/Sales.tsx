import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Trash2 } from 'lucide-react';

interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  sale_date: string;
  customers?: {
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const Sales = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([{ product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user!.id);

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity')
        .eq('user_id', user!.id)
        .gt('stock_quantity', 0);

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

  const generateInvoiceNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `INV-${timestamp}`;
  };

  const addSaleItem = () => {
    setSaleItems([...saleItems, { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeSaleItem = (index: number) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  };

  const updateSaleItem = (index: number, field: string, value: any) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].unit_price = product.price;
        updatedItems[index].total_price = product.price * updatedItems[index].quantity;
      }
    } else if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setSaleItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateSale = async () => {
    if (saleItems.some(item => !item.product_id || item.quantity <= 0)) {
      toast({
        title: "Invalid sale items",
        description: "Please fill all product details and quantities",
        variant: "destructive",
      });
      return;
    }

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const invoiceNumber = generateInvoiceNumber();

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          user_id: user!.id,
          customer_id: selectedCustomer || null,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod,
          status: 'completed'
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = saleItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of saleItems) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }
      }

      toast({ title: "Sale created successfully" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating sale",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSaleItems([{ product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
    setSelectedCustomer('');
    setPaymentMethod('cash');
    setTaxRate(0);
    setDiscountAmount(0);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  if (loading) {
    return <div>Loading sales...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">Manage sales and invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Sale</DialogTitle>
              <DialogDescription>Add products and customer details</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer (Optional)</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sale Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Products</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSaleItem}>
                    Add Item
                  </Button>
                </div>
                
                {saleItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select 
                        value={item.product_id} 
                        onValueChange={(value) => updateSaleItem(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock_quantity})
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
                        onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateSaleItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={`$${item.total_price.toFixed(2)}`}
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      {saleItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSaleItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="digital">Digital Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleCreateSale} className="w-full">
                Create Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales List */}
      <div className="grid grid-cols-1 gap-4">
        {sales.map((sale) => (
          <Card key={sale.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="h-5 w-5" />
                    <span>{sale.invoice_number}</span>
                  </CardTitle>
                  <CardDescription>
                    {sale.customers?.name || 'Walk-in Customer'} • {new Date(sale.sale_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${sale.total_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground capitalize">{sale.payment_method}</div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {sales.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No sales found. Create your first sale to get started.
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Sale
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Sales;