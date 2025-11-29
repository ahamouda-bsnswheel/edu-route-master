import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, BookOpen, Users, CheckSquare } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Building2 className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center shadow-lg">
                <Building2 className="w-10 h-10 text-secondary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
              NOC Training Portal
            </h1>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              National Oil Corporation's comprehensive Learning & Development Management System. 
              Empower your career with world-class training programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2"
              >
                Sign In
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Streamlined Training Management
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage training requests, approvals, and track your professional development.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-background card-shadow hover:card-shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Course Catalog</h3>
              <p className="text-muted-foreground">
                Browse hundreds of courses across technical, leadership, and compliance categories.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-background card-shadow hover:card-shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl gradient-secondary flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Approvals</h3>
              <p className="text-muted-foreground">
                Submit requests and track approvals through our streamlined multi-level workflow.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-background card-shadow hover:card-shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Management</h3>
              <p className="text-muted-foreground">
                Managers can nominate team members and track training progress across their teams.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">20K+</div>
              <div className="text-muted-foreground">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Providers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">6</div>
              <div className="text-muted-foreground">Entities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold">NOC Training Portal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 National Oil Corporation. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
