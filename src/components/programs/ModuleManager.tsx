import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, FileText, Video, Globe } from "lucide-react";
import { ProgramModule } from "@/hooks/usePrograms";
interface ModuleManagerProps {
  programId: string;
  modules: ProgramModule[];
  onModulesChange: () => void;
}

const MODULE_TYPES = [
  {
    type: "announcement",
    label: "Announcement",
    description: "Share news and updates with participants",
    icon: Megaphone,
  },
  {
    type: "registration",
    label: "Registration Form",
    description: "Allow users to register for this program",
    icon: FileText,
  },
  {
    type: "advertisement",
    label: "Advertisement",
    description: "Display promotional content for the program",
    icon: Video,
  },
];

export function ModuleManager({ programId, modules, onModulesChange }: ModuleManagerProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const { adminToken } = useAuth();

  const getModule = (type: string) => modules.find((m) => m.module_type === type);

  const callAdminModulesApi = async (action: string, data: Record<string, unknown>) => {
    const response = await supabase.functions.invoke("admin-modules", {
      body: { action, data },
      headers: adminToken ? { "x-admin-token": adminToken } : {},
    });

    if (response.error) {
      throw new Error(response.error.message || "API call failed");
    }

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  };

  const handleModuleToggle = async (type: string) => {
    setIsUpdating(type);
    const existingModule = getModule(type);

    try {
      if (existingModule) {
        // Delete module
        await callAdminModulesApi("delete", { id: existingModule.id });

        toast({
          title: "Module disabled",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} module has been removed.`,
        });
      } else {
        // Create module
        await callAdminModulesApi("create", {
          program_id: programId,
          module_type: type,
          is_published: false,
        });

        toast({
          title: "Module enabled",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} module has been added.`,
        });
      }

      onModulesChange();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update module";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handlePublishToggle = async (moduleId: string, currentStatus: boolean) => {
    setIsUpdating(moduleId);

    try {
      await callAdminModulesApi("update", {
        id: moduleId,
        is_published: !currentStatus,
      });

      toast({
        title: !currentStatus ? "Module published" : "Module unpublished",
        description: !currentStatus
          ? "This module is now visible to the public."
          : "This module is now hidden from the public.",
      });

      onModulesChange();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update publish status";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Program Modules
        </CardTitle>
        <CardDescription>
          Enable or disable features for this program. Toggle publish to make them visible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MODULE_TYPES.map((moduleType) => {
          const module = getModule(moduleType.type);
          const isEnabled = !!module;
          const isPublished = module?.is_published || false;
          const Icon = moduleType.icon;

          return (
            <div
              key={moduleType.type}
              className="p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-muted rounded-md shrink-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <Label className="font-medium text-sm sm:text-base">{moduleType.label}</Label>
                      {isEnabled && (
                        <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
                          {isPublished ? "Published" : "Draft"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{moduleType.description}</p>
                  </div>
                </div>
                
                {/* Enable toggle always visible on right */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Label htmlFor={`enable-${moduleType.type}`} className="text-xs sm:text-sm hidden sm:inline">
                    Enable
                  </Label>
                  <Switch
                    id={`enable-${moduleType.type}`}
                    checked={isEnabled}
                    onCheckedChange={() => handleModuleToggle(moduleType.type)}
                    disabled={isUpdating === moduleType.type}
                  />
                </div>
              </div>
              
              {/* Publish toggle shown below on mobile when enabled */}
              {isEnabled && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t sm:hidden">
                  <Label htmlFor={`publish-mobile-${moduleType.type}`} className="text-xs">
                    Publish to public
                  </Label>
                  <Switch
                    id={`publish-mobile-${moduleType.type}`}
                    checked={isPublished}
                    onCheckedChange={() => handlePublishToggle(module!.id, isPublished)}
                    disabled={isUpdating === module?.id}
                  />
                </div>
              )}
              
              {/* Desktop publish toggle */}
              {isEnabled && (
                <div className="hidden sm:flex items-center gap-2 justify-end -mt-8">
                  <Label htmlFor={`publish-${moduleType.type}`} className="text-sm">
                    Publish
                  </Label>
                  <Switch
                    id={`publish-${moduleType.type}`}
                    checked={isPublished}
                    onCheckedChange={() => handlePublishToggle(module!.id, isPublished)}
                    disabled={isUpdating === module?.id}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
