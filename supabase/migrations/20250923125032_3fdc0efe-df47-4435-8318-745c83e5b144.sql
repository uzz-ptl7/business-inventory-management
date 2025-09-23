-- Add service type support to products
ALTER TABLE public.products 
ADD COLUMN product_type text NOT NULL DEFAULT 'product',
ADD COLUMN is_service boolean NOT NULL DEFAULT false;

-- Update existing products to set product_type
UPDATE public.products SET product_type = 'product' WHERE product_type IS NULL;

-- Add country field to profiles for signup
ALTER TABLE public.profiles 
ADD COLUMN country text,
ADD COLUMN currency_code text DEFAULT 'USD',
ADD COLUMN exchange_rate numeric DEFAULT 1.0;

-- Create stock_transactions table for inventory tracking
CREATE TABLE public.stock_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'restock', 'adjustment')),
  quantity_change integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  reference_id uuid, -- references sale_id for sales, restock_id for restocks
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stock_transactions
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_transactions
CREATE POLICY "Users can view own stock transactions" 
ON public.stock_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock transactions" 
ON public.stock_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock transactions" 
ON public.stock_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create restock_orders table
CREATE TABLE public.restock_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_number text NOT NULL,
  supplier_name text,
  supplier_contact text,
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  received_date timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on restock_orders
ALTER TABLE public.restock_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for restock_orders
CREATE POLICY "Users can view own restock orders" 
ON public.restock_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own restock orders" 
ON public.restock_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own restock orders" 
ON public.restock_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own restock orders" 
ON public.restock_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create restock_items table
CREATE TABLE public.restock_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_order_id uuid NOT NULL REFERENCES public.restock_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on restock_items
ALTER TABLE public.restock_items ENABLE ROW LEVEL SECURITY;

-- Create policies for restock_items
CREATE POLICY "Users can view own restock items" 
ON public.restock_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.restock_orders 
  WHERE id = restock_items.restock_order_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can insert own restock items" 
ON public.restock_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.restock_orders 
  WHERE id = restock_items.restock_order_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can update own restock items" 
ON public.restock_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.restock_orders 
  WHERE id = restock_items.restock_order_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can delete own restock items" 
ON public.restock_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.restock_orders 
  WHERE id = restock_items.restock_order_id 
  AND user_id = auth.uid()
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_stock_transactions_updated_at
BEFORE UPDATE ON public.stock_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restock_orders_updated_at
BEFORE UPDATE ON public.restock_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create stock transaction when product stock changes
CREATE OR REPLACE FUNCTION public.create_stock_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create transaction if stock_quantity changed
  IF OLD.stock_quantity != NEW.stock_quantity THEN
    INSERT INTO public.stock_transactions (
      user_id,
      product_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'adjustment',
      NEW.stock_quantity - OLD.stock_quantity,
      OLD.stock_quantity,
      NEW.stock_quantity,
      'Stock adjustment'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;