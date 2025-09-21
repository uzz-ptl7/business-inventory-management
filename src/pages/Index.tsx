import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store, BarChart3, Users, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Track your business performance with detailed reports and insights'
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Manage products, track stock levels, and get low inventory alerts'
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Keep track of customer information and purchase history'
    },
    {
      icon: ShoppingCart,
      title: 'Sales & Invoicing',
      description: 'Create invoices, process sales, and manage transactions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Store className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Shop Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your business operations with our comprehensive shop management solution. 
            Track inventory, manage customers, process sales, and analyze your business performance.
          </p>
          <div className="space-x-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-gray-600 mb-6">
            Join thousands of business owners who trust our platform to manage their operations efficiently.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Your Free Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
