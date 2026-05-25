import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DoctorDialog } from "./DoctorDialog";
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

interface Doctor {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  branch_id: string | null;
  is_active: boolean | null;
  branches?: {
    name: string;
  };
}

export const DoctorsManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select(`
          *,
          branches (
            name
          )
        `)
        .order("full_name");
      
      if (error) throw error;
      return data as Doctor[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctors")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Doctor eliminado exitosamente");
      setDeleteDialogOpen(false);
      setDoctorToDelete(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar el doctor: " + error.message);
    },
  });

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDoctorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingDoctor(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Doctores</CardTitle>
              <CardDescription>
                Gestiona los doctores y asígnalos a sus sedes correspondientes
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Doctor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : doctors && doctors.length > 0 ? (
            <div className="grid gap-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{doctor.full_name}</p>
                      {!doctor.is_active && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {doctor.specialty && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {doctor.specialty}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      {doctor.email && <span>{doctor.email}</span>}
                      {doctor.phone && <span>{doctor.phone}</span>}
                    </div>
                    {doctor.branches && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Sede: {doctor.branches.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(doctor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(doctor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay doctores registrados. Haz clic en "Agregar Doctor" para comenzar.
            </div>
          )}
        </CardContent>
      </Card>

      <DoctorDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        doctor={editingDoctor}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este doctor del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doctorToDelete && deleteMutation.mutate(doctorToDelete)}
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