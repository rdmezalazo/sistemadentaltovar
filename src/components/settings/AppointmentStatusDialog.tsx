import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type FormData = {
  name: string;
  color: string;
  is_active: boolean;
};

type AppointmentStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: {
    id: string;
    name: string;
    color: string;
    is_active: boolean;
  };
};

export const AppointmentStatusDialog = ({
  open,
  onOpenChange,
  status,
}: AppointmentStatusDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      name: "",
      color: "#10b981",
      is_active: true,
    },
  });

  useEffect(() => {
    if (status) {
      reset({
        name: status.name,
        color: status.color,
        is_active: status.is_active,
      });
    } else {
      reset({
        name: "",
        color: "#10b981",
        is_active: true,
      });
    }
  }, [status, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (status) {
        const { error } = await supabase
          .from("appointment_statuses")
          .update(data)
          .eq("id", status.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("appointment_statuses")
          .insert([data]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-statuses"] });
      toast({
        title: status ? "Estado actualizado" : "Estado creado",
        description: status
          ? "El estado ha sido actualizado correctamente"
          : "El estado ha sido creado correctamente",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el estado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {status ? "Editar Estado" : "Nuevo Estado"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Estado</Label>
            <Input
              id="name"
              {...register("name", { required: true })}
              placeholder="Ej: Programada, Completada, Cancelada"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                {...register("color", { required: true })}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                {...register("color", { required: true })}
                placeholder="#10b981"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este color se mostrará en el calendario para las citas con este estado
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Estado activo</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
