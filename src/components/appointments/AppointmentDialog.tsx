import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Clock, Check, ChevronsUpDown, Search, UserPlus, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientDialog } from "@/components/patients/PatientDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Generar slots de tiempo cada 15 minutos de 8:00 a 20:00
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 20 && minute > 0) break;
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(time);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

type SelectedConcept = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  default_price: number;
};

const appointmentSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  appointment_date: z.date({ required_error: "Seleccione fecha y hora" }),
  time: z.string().min(1, "Ingrese la hora"),
  status: z.string().default("scheduled"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

type AppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: any;
  onSuccess: () => void;
};

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: AppointmentDialogProps) {
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState<SelectedConcept[]>([]);
  const [conceptPopoverOpen, setConceptPopoverOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, dni")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: appointmentStatuses } = useQuery({
    queryKey: ["appointment-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_statuses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as { id: string; name: string; color: string }[];
    },
  });

  const { data: paymentConcepts } = useQuery({
    queryKey: ["payment-concepts-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_concepts")
        .select("id, name, default_price")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: "",
      status: "scheduled",
      notes: "",
    },
  });

  useEffect(() => {
    if (appointment) {
      const appointmentDate = new Date(appointment.appointment_date);
      form.reset({
        patient_id: appointment.patient_id || "",
        appointment_date: appointmentDate,
        time: format(appointmentDate, "HH:mm"),
        status: appointment.status,
        notes: appointment.notes || "",
      });
      setSelectedConcepts([]);
    } else {
      form.reset({
        patient_id: "",
        status: "scheduled",
        notes: "",
      });
      setSelectedConcepts([]);
    }
  }, [appointment, form, open]);

  const addConcept = (concept: { id: string; name: string; default_price: number }) => {
    const exists = selectedConcepts.find(c => c.id === concept.id);
    if (exists) {
      setSelectedConcepts(prev =>
        prev.map(c =>
          c.id === concept.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setSelectedConcepts(prev => [
        ...prev,
        {
          id: concept.id,
          name: concept.name,
          quantity: 1,
          unit_price: concept.default_price,
          default_price: concept.default_price,
        },
      ]);
    }
    setConceptPopoverOpen(false);
  };

  const removeConcept = (id: string) => {
    setSelectedConcepts(prev => prev.filter(c => c.id !== id));
  };

  const updateConceptQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedConcepts(prev =>
      prev.map(c => (c.id === id ? { ...c, quantity } : c))
    );
  };

  const updateConceptPrice = (id: string, unit_price: number) => {
    if (unit_price < 0) return;
    setSelectedConcepts(prev =>
      prev.map(c => (c.id === id ? { ...c, unit_price } : c))
    );
  };

  const totalAmount = selectedConcepts.reduce(
    (sum, c) => sum + c.quantity * c.unit_price,
    0
  );

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Debe iniciar sesión");
        return;
      }

      // Combinar fecha y hora
      const [hours, minutes] = values.time.split(":");
      const appointmentDateTime = new Date(values.appointment_date);
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const treatmentNames = selectedConcepts.map(c => c.name).join(", ");

      const appointmentData = {
        patient_id: values.patient_id,
        appointment_date: appointmentDateTime.toISOString(),
        status: values.status,
        treatment: treatmentNames || null,
        notes: values.notes || null,
        created_by: userData.user.id,
      };

      if (appointment) {
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointment.id);

        if (error) throw error;
        toast.success("Cita actualizada correctamente");
      } else {
        // Create appointment
        const { data: newAppointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert(appointmentData)
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Create account if concepts are selected
        if (selectedConcepts.length > 0) {
          // Generate account number
          const { data: accountNumber } = await supabase.rpc("generate_account_number");
          
          // Create account
          const { data: newAccount, error: accountError } = await supabase
            .from("accounts")
            .insert({
              account_number: accountNumber || `CTA-${Date.now()}`,
              appointment_id: newAppointment.id,
              patient_id: values.patient_id,
              total_amount: totalAmount,
              paid_amount: 0,
              balance: totalAmount,
              status: "pending",
              created_by: userData.user.id,
            })
            .select()
            .single();

          if (accountError) throw accountError;

          // Create account concepts
          const conceptsToInsert = selectedConcepts.map(c => ({
            account_id: newAccount.id,
            concept_id: c.id,
            quantity: c.quantity,
            unit_price: c.unit_price,
            subtotal: c.quantity * c.unit_price,
            status: "pending",
            paid_amount: 0,
          }));

          const { error: conceptsError } = await supabase
            .from("account_concepts")
            .insert(conceptsToInsert);

          if (conceptsError) throw conceptsError;

          toast.success("Cita y cuenta creadas correctamente");
        } else {
          toast.success("Cita creada correctamente");
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la cita");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => {
                const selectedPatient = patients?.find(p => p.id === field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Paciente</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex-1 justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {selectedPatient ? (
                                <span className="flex items-center gap-2">
                                  <Search className="h-4 w-4 shrink-0" />
                                  {selectedPatient.full_name} - {selectedPatient.dni}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Search className="h-4 w-4" />
                                  Buscar paciente...
                                </span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nombre o DNI..." />
                            <CommandList>
                              <CommandEmpty>No se encontró ningún paciente.</CommandEmpty>
                              <CommandGroup>
                                {patients?.map((patient) => (
                                  <CommandItem
                                    key={patient.id}
                                    value={`${patient.full_name} ${patient.dni}`}
                                    onSelect={() => {
                                      field.onChange(patient.id);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === patient.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{patient.full_name}</span>
                                      <span className="text-sm text-muted-foreground">DNI: {patient.dni}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setPatientDialogOpen(true)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Agregar nuevo paciente</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Hora</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {field.value}
                              </span>
                            ) : (
                              <span>Seleccione hora</span>
                            )}
                            <Clock className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0" align="start">
                        <ScrollArea className="h-64">
                          <div className="grid grid-cols-2 gap-1 p-2">
                            {TIME_SLOTS.map((time) => (
                              <Button
                                key={time}
                                type="button"
                                variant={field.value === time ? "default" : "ghost"}
                                size="sm"
                                className="justify-center"
                                onClick={() => field.onChange(time)}
                              >
                                {time}
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appointmentStatuses?.map((status) => (
                        <SelectItem key={status.id} value={status.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Concepts/Treatments Section */}
            {!appointment && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Conceptos/Tratamientos</FormLabel>
                  <Popover open={conceptPopoverOpen} onOpenChange={setConceptPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Buscar concepto..." />
                        <CommandList>
                          <CommandEmpty>No se encontró concepto.</CommandEmpty>
                          <CommandGroup>
                            {paymentConcepts?.map((concept) => (
                              <CommandItem
                                key={concept.id}
                                value={concept.name}
                                onSelect={() => addConcept(concept)}
                              >
                                <div className="flex justify-between w-full">
                                  <span>{concept.name}</span>
                                  <span className="text-muted-foreground">
                                    S/ {Number(concept.default_price).toFixed(2)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedConcepts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay conceptos agregados. Agregue tratamientos para crear una cuenta.
                  </p>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3">
                    {selectedConcepts.map((concept) => (
                      <div
                        key={concept.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{concept.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Precio base: S/ {concept.default_price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={concept.quantity}
                            onChange={(e) =>
                              updateConceptQuantity(concept.id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 h-8 text-center"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={concept.unit_price}
                            onChange={(e) =>
                              updateConceptPrice(concept.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeConcept(concept.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          S/ {(concept.quantity * concept.unit_price).toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="font-medium">Total de la cuenta:</span>
                      <span className="font-bold text-lg">S/ {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {appointment ? "Actualizar" : "Crear"} Cita
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <PatientDialog
        open={patientDialogOpen}
        onClose={() => {
          setPatientDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }}
        patient={null}
      />
    </Dialog>
  );
}
