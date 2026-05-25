import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppointmentStatusDialog } from "./AppointmentStatusDialog";

type AppointmentStatus = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  display_order: number;
};

export const AppointmentStatusesManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["appointment-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_statuses")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as AppointmentStatus[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointment_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-statuses"] });
      toast({
        title: "Estado eliminado",
        description: "El estado ha sido eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el estado",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (status: AppointmentStatus) => {
    setSelectedStatus(status);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStatus(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de eliminar este estado?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStatus(undefined);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estados de Citas</CardTitle>
              <CardDescription>
                Gestiona los estados disponibles para las citas y sus colores
              </CardDescription>
            </div>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Estado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : statuses && statuses.length > 0 ? (
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-border"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-medium">{status.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Color: {status.color}
                        </span>
                        {!status.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(status)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(status.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay estados configurados
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentStatusDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        status={selectedStatus}
      />
    </>
  );
};
