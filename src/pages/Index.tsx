import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Package, ShoppingCart, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import sitecraftersLogo from '@/assets/sitecrafters-logo-icon.png';

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
            <img src={sitecraftersLogo} alt="Sitecrafters" className="h-20 w-20" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Business Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your business operations with our comprehensive management solution. 
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
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mb-16">
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

        {/* Contact Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Need Help? Contact Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Phone className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Phone Support</h3>
              <p className="text-gray-600">Get instant help with our dedicated support team</p>
              <Button variant="outline" className="mt-4">
                Call Support
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <Mail className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Email Support</h3>
              <p className="text-gray-600">Send us your questions and we'll respond quickly</p>
              <Button variant="outline" className="mt-4">
                Email Us
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <MapPin className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-600">Schedule an in-person consultation</p>
              <Button variant="outline" className="mt-4">
                Get Directions
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <img src={sitecraftersLogo} alt="Sitecrafters" className="h-8 w-8 mr-3" />
                <h3 className="text-xl font-bold">Sitecrafters</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Empowering businesses with innovative web solutions and comprehensive management tools.
              </p>
              <a 
                href="https://www.sitecraftersz.co/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 font-medium"
              >
                Visit Sitecrafters Website →
              </a>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Button variant="link" className="p-0 h-auto text-gray-400 hover:text-white" onClick={() => navigate('/auth')}>Get Started</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-gray-400 hover:text-white">Features</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-gray-400 hover:text-white">Pricing</Button></li>
                <li><Button variant="link" className="p-0 h-auto text-gray-400 hover:text-white">Support</Button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-400">
                <p className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  support@sitecraftersz.co
                </p>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +1 (555) 123-4567
                </p>
                <p className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Business District, City
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Sitecrafters. All rights reserved. | Powered by Sitecrafters Web Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
