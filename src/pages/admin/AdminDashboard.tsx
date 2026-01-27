import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats } from "@/hooks/useAdminStats";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, Navigate } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  ClipboardList, 
  TrendingUp,
  MapPin,
  Layers,
  ArrowRight,
  LogOut,
  Shield,
  Loader2,
  Building2
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DivisionInfo {
  id: string;
  name: string;
  description: string | null;
}

export default function AdminDashboard() {
  const { isAdmin, isSuperAdmin, signOut, adminData, adminToken, user } = useAuth();
  const stats = useAdminStats();
  const [divisionInfo, setDivisionInfo] = useState<DivisionInfo | null>(null);

  useEffect(() => {
    const fetchDivisionInfo = async () => {
      if (adminData?.division_id) {
        const { data } = await supabase
          .from("divisions")
          .select("id, name, description")
          .eq("id", adminData.division_id)
          .maybeSingle();
        
        if (data) {
          setDivisionInfo(data);
        }
      }
    };

    fetchDivisionInfo();
  }, [adminData]);

  // Redirect super admins to their dashboard
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const getDisplayName = () => {
    if (adminToken && divisionInfo) {
      return `Admin - ${divisionInfo.name}`;
    }
    return user?.email || "User";
  };

  if (stats.isLoading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, {getDisplayName()}
              </p>
              {divisionInfo && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    {divisionInfo.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Admin
              </span>
              <Button variant="outline" size="sm" onClick={signOut} className="h-8 sm:h-9">
                <LogOut className="h-4 w-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">Sign Out</span>
                <span className="xs:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <StatsCard
            title="Total Programs"
            value={stats.totalPrograms}
            description={`${stats.activePrograms} active`}
            icon={Calendar}
          />
          <StatsCard
            title="Registrations"
            value={stats.totalRegistrations}
            icon={ClipboardList}
          />
          <StatsCard
            title="Active Programs"
            value={stats.activePrograms}
            icon={TrendingUp}
          />
          <StatsCard
            title="Total Members"
            value={stats.totalMembers}
            icon={Users}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8">
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4">
            <Link to="/admin/programs" className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Programs</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4">
            <Link to="/admin/members" className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Members</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4">
            <Link to="/admin/clusters" className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Clusters</span>
            </Link>
          </Button>
          <Button asChild className="h-auto py-3 sm:py-4">
            <Link to="/admin/programs" className="flex flex-col items-center gap-1.5 sm:gap-2">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">New Program</span>
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Panchayath-wise Stats */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Panchayath Stats
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Programs and registrations by panchayath
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {stats.panchayathStats.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No data available
                </p>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Panchayath</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Prog.</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Reg.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.panchayathStats.slice(0, 5).map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">{stat.name}</TableCell>
                          <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-4">{stat.programs}</TableCell>
                          <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-4">{stat.registrations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cluster-wise Stats */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Cluster Stats
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Member distribution by cluster
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {stats.clusterStats.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No data available
                </p>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Cluster</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Panchayath</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Members</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.clusterStats.slice(0, 5).map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell className="py-2 sm:py-4">
                            <div className="font-medium text-xs sm:text-sm">{stat.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{stat.panchayath_name}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">
                            {stat.panchayath_name}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-4">{stat.members}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats.error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            Error loading stats: {stats.error}
          </div>
        )}
      </div>
    </Layout>
  );
}
