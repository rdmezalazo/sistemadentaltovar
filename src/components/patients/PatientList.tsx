import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Phone, Mail } from "lucide-react";
import { Patient } from "@/pages/Patients";

interface PatientListProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
}

export const PatientList = ({ patients, onEdit }: PatientListProps) => {
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron pacientes</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>DNI</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Edad</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Género</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">{patient.dni}</TableCell>
              <TableCell>{patient.full_name}</TableCell>
              <TableCell>{calculateAge(patient.birth_date)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {patient.phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3" />
                      {patient.phone}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="w-3 h-3" />
                      {patient.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {patient.gender && (
                  <Badge variant="secondary">
                    {patient.gender === "M" ? "M" : patient.gender === "F" ? "F" : "Otro"}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(patient)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};