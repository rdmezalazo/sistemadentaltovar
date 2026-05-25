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

interface PaymentMethodFormData {
  name: string;
  description: string;
  is_active: boolean;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
  } | null;
}

export const PaymentMethodDialog = ({ open, onOpenChange, method }: PaymentMethodDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<PaymentMethodFormData>({
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (method) {
      reset({
        name: method.name,
        description: method.description || "",
        is_active: method.is_active ?? true,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [method, reset]);

  const mutation = useMutation({
    mutationFn: async (data: PaymentMethodFormData) => {
      const methodData = {
        name: data.name,
        description: data.description || null,
        is_active: data.is_active,
      };

      if (method) {
        const { error } = await supabase
          .from("payment_methods")
          .update(methodData)
          .eq("id", method.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_methods")
          .insert([methodData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success(method ? "Método actualizado exitosamente" : "Método creado exitosamente");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar el método: " + error.message);
    },
  });

  const onSubmit = (data: PaymentMethodFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{method ? "Editar Método de Pago" : "Agregar Método de Pago"}</DialogTitle>
          <DialogDescription>
            {method
              ? "Modifica el método de pago"
              : "Completa los datos para agregar un nuevo método de pago"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register("name", { required: true })}
              placeholder="Efectivo, Tarjeta, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Breve descripción del método"
            />
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
              {mutation.isPending ? "Guardando..." : method ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};