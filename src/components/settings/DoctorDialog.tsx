import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface DoctorFormData {
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  branch_id: string;
  is_active: boolean;
}

interface DoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    branch_id: string | null;
    is_active: boolean | null;
  } | null;
}

export const DoctorDialog = ({ open, onOpenChange, doctor }: DoctorDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<DoctorFormData>({
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      specialty: "",
      branch_id: "",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (doctor) {
      reset({
        full_name: doctor.full_name,
        email: doctor.email || "",
        phone: doctor.phone || "",
        specialty: doctor.specialty || "",
        branch_id: doctor.branch_id || "",
        is_active: doctor.is_active ?? true,
      });
    } else {
      reset({
        full_name: "",
        email: "",
        phone: "",
        specialty: "",
        branch_id: "",
        is_active: true,
      });
    }
  }, [doctor, reset]);

  const mutation = useMutation({
    mutationFn: async (data: DoctorFormData) => {
      const doctorData = {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        specialty: data.specialty || null,
        branch_id: data.branch_id || null,
        is_active: data.is_active,
      };

      if (doctor) {
        const { error } = await supabase
          .from("doctors")
          .update(doctorData)
          .eq("id", doctor.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("doctors")
          .insert([doctorData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(doctor ? "Doctor actualizado exitosamente" : "Doctor creado exitosamente");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error al guardar el doctor: " + error.message);
    },
  });

  const onSubmit = (data: DoctorFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{doctor ? "Editar Doctor" : "Agregar Doctor"}</DialogTitle>
          <DialogDescription>
            {doctor
              ? "Modifica los datos del doctor"
              : "Completa los datos para agregar un nuevo doctor"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: true })}
              placeholder="Dr. Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidad</Label>
            <Input
              id="specialty"
              {...register("specialty")}
              placeholder="Odontología General"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="doctor@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="+51 999 999 999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch_id">Sede</Label>
            <Select
              value={watch("branch_id")}
              onValueChange={(value) => setValue("branch_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {mutation.isPending ? "Guardando..." : doctor ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};