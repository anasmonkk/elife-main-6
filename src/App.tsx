import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Divisions from "./pages/Divisions";
import Programs from "./pages/Programs";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import AdminsManagement from "./pages/admin/AdminsManagement";
import MembersManagement from "./pages/admin/MembersManagement";
import LocationsManagement from "./pages/admin/LocationsManagement";
import ClustersManagement from "./pages/admin/ClustersManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/divisions" element={<Divisions />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Super Admin only */}
            <Route
              path="/admin/admins"
              element={
                <ProtectedRoute requiredRoles={["super_admin"]}>
                  <AdminsManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Super Admin only: Locations */}
            <Route
              path="/admin/locations"
              element={
                <ProtectedRoute requiredRoles={["super_admin"]}>
                  <LocationsManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Admin & Super Admin: Clusters */}
            <Route
              path="/admin/clusters"
              element={
                <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
                  <ClustersManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Admin & Super Admin: Members */}
            <Route
              path="/admin/members"
              element={
                <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
                  <MembersManagement />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
