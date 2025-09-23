import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Truck,
  BarChart3, 
  Settings, 
  LogOut,
  Menu
} from 'lucide-react';
import sitecraftersLogo from '@/assets/sitecrafters-logo-icon.png';

const Layout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Package, label: 'Products', path: '/dashboard/products' },
    { icon: Users, label: 'Customers', path: '/dashboard/customers' },
    { icon: ShoppingCart, label: 'Sales', path: '/dashboard/sales' },
    { icon: Truck, label: 'Restock', path: '/dashboard/restock' },
    { icon: BarChart3, label: 'Reports', path: '/dashboard/reports' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-2">
              <img src={sitecraftersLogo} alt="Sitecrafters" className="h-6 w-6" />
              <span className="font-semibold text-sidebar-foreground">Business Manager</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="bg-background border-b border-border p-4 flex items-center gap-4">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <h1 className="font-semibold text-foreground">Business Management System</h1>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;