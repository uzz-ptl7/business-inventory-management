import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CalendarDays, TrendingUp, DollarSign, Package } from 'lucide-react';

interface SalesReport {
  period: string;
  sales: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('30');
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    topSellingProduct: '',
  });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, reportPeriod]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const daysBack = parseInt(reportPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, sale_date')
        .eq('user_id', user!.id)
        .gte('sale_date', startDate.toISOString());

      if (salesError) throw salesError;

      // Fetch product sales data
      const { data: productSales, error: productError } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          total_price,
          products(name),
          sales(sale_date, user_id)
        `)
        .gte('sales.sale_date', startDate.toISOString())
        .eq('sales.user_id', user!.id);

      if (productError) throw productError;

      // Process sales data by period
      const salesByDate: { [key: string]: { sales: number; revenue: number } } = {};
      
      if (daysBack <= 7) {
        // Daily breakdown for last 7 days
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toLocaleDateString();
          salesByDate[dateKey] = { sales: 0, revenue: 0 };
        }
      } else if (daysBack <= 30) {
        // Daily breakdown for last 30 days
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toLocaleDateString();
          salesByDate[dateKey] = { sales: 0, revenue: 0 };
        }
      } else {
        // Monthly breakdown for longer periods
        for (let i = Math.ceil(daysBack / 30) - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          salesByDate[dateKey] = { sales: 0, revenue: 0 };
        }
      }

      // Populate actual sales data
      sales?.forEach(sale => {
        const saleDate = new Date(sale.sale_date);
        let dateKey: string;
        
        if (daysBack <= 30) {
          dateKey = saleDate.toLocaleDateString();
        } else {
          dateKey = saleDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
        
        if (salesByDate[dateKey]) {
          salesByDate[dateKey].sales += 1;
          salesByDate[dateKey].revenue += Number(sale.total_amount);
        }
      });

      const chartData = Object.entries(salesByDate).map(([period, data]) => ({
        period,
        sales: data.sales,
        revenue: data.revenue,
      }));

      setSalesData(chartData);

      // Process top products
      const productStats: { [key: string]: { quantity: number; revenue: number } } = {};
      
      productSales?.forEach(item => {
        const productName = item.products?.name || 'Unknown Product';
        if (!productStats[productName]) {
          productStats[productName] = { quantity: 0, revenue: 0 };
        }
        productStats[productName].quantity += item.quantity;
        productStats[productName].revenue += Number(item.total_price);
      });

      const topProductsData = Object.entries(productStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopProducts(topProductsData);

      // Calculate total stats
      const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalSales = sales?.length || 0;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
      const topSellingProduct = topProductsData[0]?.name || 'N/A';

      setTotalStats({
        totalRevenue,
        totalSales,
        averageOrderValue,
        topSellingProduct,
      });

    } catch (error: any) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <Select value={reportPeriod} onValueChange={setReportPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Last {reportPeriod} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{totalStats.topSellingProduct}</div>
            <p className="text-xs text-muted-foreground">Best seller</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Number of sales over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Revenue generated over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>Detailed product statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.quantity} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${product.revenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">#{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;