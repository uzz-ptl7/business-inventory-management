-- Ensure all required tables exist with proper structure

-- Check if profiles table exists and has the required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE,
            business_name TEXT,
            full_name TEXT,
            country TEXT,
            currency_code TEXT NOT NULL DEFAULT 'USD',
            exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Check if customers table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        CREATE TABLE public.customers (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            user_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own customers" ON public.customers FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Check if products table exists with the new columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE TABLE public.products (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL,
            barcode TEXT,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            cost DECIMAL(10,2) NOT NULL,
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 10,
            category TEXT,
            product_type TEXT NOT NULL DEFAULT 'physical',
            is_service BOOLEAN NOT NULL DEFAULT false,
            user_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own products" ON public.products FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Check if sales table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        CREATE TABLE public.sales (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            customer_id UUID,
            invoice_number TEXT NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            payment_method TEXT NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            FOREIGN KEY (customer_id) REFERENCES public.customers(id)
        );
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own sales" ON public.sales FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Check if sale_items table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
        CREATE TABLE public.sale_items (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            sale_id UUID NOT NULL,
            product_id UUID NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES public.products(id)
        );
        ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view sale items for their sales" ON public.sale_items FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
        );
        CREATE POLICY "Users can manage sale items for their sales" ON public.sale_items FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
        );
        CREATE POLICY "Users can update sale items for their sales" ON public.sale_items FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
        );
        CREATE POLICY "Users can delete sale items for their sales" ON public.sale_items FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
        );
    END IF;
END $$;

-- Check if restock_orders table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restock_orders') THEN
        CREATE TABLE public.restock_orders (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            order_number TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            supplier_contact TEXT,
            total_cost DECIMAL(10,2) NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            received_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        ALTER TABLE public.restock_orders ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own restock orders" ON public.restock_orders FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Check if restock_items table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restock_items') THEN
        CREATE TABLE public.restock_items (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            restock_order_id UUID NOT NULL,
            product_id UUID NOT NULL,
            quantity INTEGER NOT NULL,
            unit_cost DECIMAL(10,2) NOT NULL,
            total_cost DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            FOREIGN KEY (restock_order_id) REFERENCES public.restock_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES public.products(id)
        );
        ALTER TABLE public.restock_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view restock items for their orders" ON public.restock_items FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.restock_orders WHERE restock_orders.id = restock_items.restock_order_id AND restock_orders.user_id = auth.uid())
        );
        CREATE POLICY "Users can manage restock items for their orders" ON public.restock_items FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.restock_orders WHERE restock_orders.id = restock_items.restock_order_id AND restock_orders.user_id = auth.uid())
        );
        CREATE POLICY "Users can update restock items for their orders" ON public.restock_items FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.restock_orders WHERE restock_orders.id = restock_items.restock_order_id AND restock_orders.user_id = auth.uid())
        );
        CREATE POLICY "Users can delete restock items for their orders" ON public.restock_items FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.restock_orders WHERE restock_orders.id = restock_items.restock_order_id AND restock_orders.user_id = auth.uid())
        );
    END IF;
END $$;

-- Check if stock_transactions table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transactions') THEN
        CREATE TABLE public.stock_transactions (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            product_id UUID NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            reference_type TEXT,
            reference_id UUID,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            FOREIGN KEY (product_id) REFERENCES public.products(id)
        );
        ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own stock transactions" ON public.stock_transactions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers to tables that have updated_at columns
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- customers
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_customers_updated_at') THEN
        CREATE TRIGGER update_customers_updated_at
        BEFORE UPDATE ON public.customers
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- products
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON public.products
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- sales
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_sales_updated_at') THEN
        CREATE TRIGGER update_sales_updated_at
        BEFORE UPDATE ON public.sales
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- restock_orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_restock_orders_updated_at') THEN
        CREATE TRIGGER update_restock_orders_updated_at
        BEFORE UPDATE ON public.restock_orders
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Create the stock transaction helper function
CREATE OR REPLACE FUNCTION public.create_stock_transaction(
    p_user_id UUID,
    p_product_id UUID,
    p_transaction_type TEXT,
    p_quantity INTEGER,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.stock_transactions (
        user_id,
        product_id,
        transaction_type,
        quantity,
        reference_type,
        reference_id,
        notes
    ) VALUES (
        p_user_id,
        p_product_id,
        p_transaction_type,
        p_quantity,
        p_reference_type,
        p_reference_id,
        p_notes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;