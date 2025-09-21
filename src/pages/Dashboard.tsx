import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, Users, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  lowStockProducts: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
  });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    setProfile(data);
  };

  const loadDashboardData = async () => {
    if (!user) return;

    // Load products stats
    const { data: products } = await supabase
      .from('products')
      .select('stock_quantity, low_stock_threshold')
      .eq('user_id', user.id);

    const totalProducts = products?.length || 0;
    const lowStockProducts = products?.filter(p => p.stock_quantity <= p.low_stock_threshold).length || 0;

    // Load customers count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Load sales stats
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, sale_date')
      .eq('user_id', user.id);

    const totalSales = sales?.length || 0;
    const totalRevenue = sales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;

    // Calculate time-based sales
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = sales?.filter(sale => 
      sale.sale_date.startsWith(todayStr)
    ).reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;

    const weekSales = sales?.filter(sale => 
      new Date(sale.sale_date) >= weekAgo
    ).reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;

    const monthSales = sales?.filter(sale => 
      new Date(sale.sale_date) >= monthAgo
    ).reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;

    setStats({
      totalProducts,
      totalCustomers: totalCustomers || 0,
      totalSales,
      totalRevenue,
      lowStockProducts,
      todaySales,
      weekSales,
      monthSales,
    });
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Total Sales',
      value: stats.totalSales,
      icon: ShoppingCart,
      color: 'text-purple-600',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  const alertCards = [
    {
      title: 'Low Stock Alert',
      value: stats.lowStockProducts,
      description: 'Products running low',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  const salesCards = [
    {
      title: 'Today\'s Sales',
      value: `$${stats.todaySales.toFixed(2)}`,
      period: 'Today',
    },
    {
      title: 'This Week',
      value: `$${stats.weekSales.toFixed(2)}`,
      period: 'Last 7 days',
    },
    {
      title: 'This Month',
      value: `$${stats.monthSales.toFixed(2)}`,
      period: 'Last 30 days',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {profile?.owner_name || 'User'}!
        </h1>
        <p className="text-blue-100">
          {profile?.business_name || 'Your Business'} - Dashboard Overview
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {salesCards.map((sale) => (
          <Card key={sale.title}>
            <CardHeader>
              <CardTitle className="text-lg">{sale.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {sale.value}
              </div>
              <p className="text-sm text-muted-foreground">{sale.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alertCards.map((alert) => (
          <Card key={alert.title} className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {alert.title}
              </CardTitle>
              <alert.icon className={`h-4 w-4 ${alert.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {alert.value}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {alert.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;