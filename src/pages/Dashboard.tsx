import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  Building2, 
  MapPin, 
  Shield,
  LogOut,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  const { user, roles, isSuperAdmin, isAdmin, signOut } = useAuth();

  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isAdmin) return "Admin";
    return "Member";
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="h-4 w-4" />
              {getRoleLabel()}
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Super Admin & Admin: Manage Members */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Members
                </CardTitle>
                <CardDescription>
                  Manage cluster members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin/members">View Members</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Super Admin: Manage Admins */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Admins
                </CardTitle>
                <CardDescription>
                  Manage division administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin/admins">Manage Admins</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Super Admin: Manage Divisions */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Divisions
                </CardTitle>
                <CardDescription>
                  Manage organization divisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin/divisions">Manage Divisions</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Super Admin: Manage Locations */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Locations
                </CardTitle>
                <CardDescription>
                  Manage panchayaths & clusters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin/locations">Manage Locations</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin: Programs (placeholder for future) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Programs
                </CardTitle>
                <CardDescription>
                  Create and manage programs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/programs">View Programs</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
