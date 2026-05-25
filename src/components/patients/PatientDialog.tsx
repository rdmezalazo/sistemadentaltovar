import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@/pages/Patients";

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

export const PatientDialog = ({ open, onClose, patient }: PatientDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { toast } = useToast();
  const gender = watch("gender");

  useEffect(() => {
    if (patient) {
      Object.entries(patient).forEach(([key, value]) => {
        setValue(key, value || "");
      });
    } else {
      reset();
    }
  }, [patient, reset, setValue]);

  const onSubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      const patientData = {
        ...data,
        birth_date: data.birth_date || null,
        created_by: user.id,
      };

      if (patient) {
        const { error } = await supabase
          .from("patients")
          .update(patientData)
          .eq("id", patient.id);

        if (error) throw error;

        toast({
          title: "Paciente actualizado",
          description: "Los datos se han actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from("patients")
          .insert([patientData]);

        if (error) throw error;

        toast({
          title: "Paciente registrado",
          description: "El paciente se ha registrado correctamente",
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar el paciente",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {patient ? "Editar Paciente" : "Nuevo Paciente"}
          </DialogTitle>
          <DialogDescription>
            Complete los datos del paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                {...register("dni", { required: true })}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: true })}
                placeholder="Juan Pérez García"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                {...register("birth_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Género</Label>
              <Select
                value={gender}
                onValueChange={(value) => setValue("gender", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="O">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="987654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="paciente@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Av. Principal 123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Contacto de Emergencia</Label>
              <Input
                id="emergency_contact"
                {...register("emergency_contact")}
                placeholder="María Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Teléfono de Emergencia</Label>
              <Input
                id="emergency_phone"
                {...register("emergency_phone")}
                placeholder="987654321"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_history">Historia Médica</Label>
            <Textarea
              id="medical_history"
              {...register("medical_history")}
              placeholder="Antecedentes médicos relevantes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias</Label>
            <Textarea
              id="allergies"
              {...register("allergies")}
              placeholder="Lista de alergias conocidas..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {patient ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};