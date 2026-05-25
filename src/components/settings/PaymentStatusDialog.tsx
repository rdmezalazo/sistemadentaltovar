import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PaymentStatusFormData {
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

interface PaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    is_active: boolean | null;
  } | null;
}

export const PaymentStatusDialog = ({ open, onOpenChange, status }: PaymentStatusDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<PaymentStatusFormData>({
    defaultValues: {
      name: "",
      description: "",
      color: "#6b7280",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (status) {
      reset({
        name: status.name,
        description: status.description || "",
        color: status.color,
        is_active: status.is_active ?? true,
      });
    } else {
      reset({
        name: "",
        description: "",
        color: "#6b7280",
        is_active: true,
      });
    }
  }, [status, reset]);

  const mutation = useMutation({
    mutationFn: async (data: PaymentStatusFormData) => {
      const statusData = {
        name: data.name,
        description: data.description || null,
        color: data.color,
        is_active: data.is_active,
      };

      if (status) {
        const { error } = await supabase
          .from("payment_statuses")
          .update(statusData)
          .eq("id", status.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_statuses")
          .insert([statusData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-statuses"] });
      toast.success(status ? "Estado actualizado exitosamente" : "Estado creado exitosamente");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar el estado: " + error.message);
    },
  });

  const onSubmit = (data: PaymentStatusFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{status ? "Editar Estado de Pago" : "Agregar Estado de Pago"}</DialogTitle>
          <DialogDescription>
            {status
              ? "Modifica el estado de pago"
              : "Completa los datos para agregar un nuevo estado de pago"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register("name", { required: true })}
              placeholder="Pagado, Pendiente, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Breve descripción del estado"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                {...register("color", { required: true })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                {...register("color", { required: true })}
                placeholder="#6b7280"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Activo</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : status ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};