import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PaymentStatusDialog } from "./PaymentStatusDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentStatus {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean | null;
}

export const PaymentStatusesManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<PaymentStatus | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["payment-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_statuses")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as PaymentStatus[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_statuses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-statuses"] });
      toast.success("Estado de pago eliminado exitosamente");
      setDeleteDialogOpen(false);
      setStatusToDelete(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar el estado: " + error.message);
    },
  });

  const handleEdit = (status: PaymentStatus) => {
    setEditingStatus(status);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setStatusToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingStatus(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estados de Pago</CardTitle>
              <CardDescription>
                Estados disponibles para clasificar los pagos
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Estado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : statuses && statuses.length > 0 ? (
            <div className="grid gap-4">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-medium">{status.name}</p>
                      {status.description && (
                        <p className="text-sm text-muted-foreground">{status.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!status.is_active && (
                      <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                        Inactivo
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(status)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(status.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay estados de pago configurados.
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentStatusDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        status={editingStatus}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este estado de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusToDelete && deleteMutation.mutate(statusToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};