import { useState } from "react";
import { Calendar, Clock, Plus, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  patient: {
    full_name: string;
    dni: string;
  };
  diagnosis?: string;
  treatment?: string;
};

const Appointments = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const { data: appointmentStatuses } = useQuery({
    queryKey: ["appointment-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_statuses")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      return data as { id: string; name: string; color: string }[];
    },
  });

  const { data: appointments, refetch } = useQuery({
    queryKey: ["appointments", currentDate, view],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (view === "day") {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (view === "week") {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          diagnosis,
          treatment,
          patient:patients(full_name, dni)
        `)
        .gte("appointment_date", startDate.toISOString())
        .lte("appointment_date", endDate.toISOString())
        .order("appointment_date");

      if (error) throw error;
      return data as unknown as Appointment[];
    },
  });

  const handlePrevious = () => {
    if (view === "day") setCurrentDate(subDays(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (view === "day") setCurrentDate(addDays(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (statusName: string) => {
    const status = appointmentStatuses?.find(s => s.name === statusName);
    if (!status) return "bg-muted text-muted-foreground";
    
    return `hover:opacity-80`;
  };

  const getStatusBgColor = (statusName: string) => {
    const status = appointmentStatuses?.find(s => s.name === statusName);
    return status?.color || "#94a3b8";
  };

  const getStatusLabel = (status: string) => {
    return status;
  };

  const renderDayView = () => {
    const dayAppointments = appointments?.filter((apt) =>
      isSameDay(new Date(apt.appointment_date), currentDate)
    ) || [];

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {dayAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay citas programadas para este día
              </CardContent>
            </Card>
          ) : (
            dayAppointments.map((apt) => (
              <Card
                key={apt.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedAppointment(apt);
                  setDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(new Date(apt.appointment_date), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{apt.patient.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({apt.patient.dni})
                        </span>
                      </div>
                      {apt.diagnosis && (
                        <p className="text-sm text-muted-foreground">
                          Diagnóstico: {apt.diagnosis}
                        </p>
                      )}
                    </div>
                    <Badge 
                      className={getStatusColor(apt.status)}
                      style={{ backgroundColor: getStatusBgColor(apt.status), color: '#fff' }}
                    >
                      {getStatusLabel(apt.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayAppointments = appointments?.filter((apt) =>
            isSameDay(new Date(apt.appointment_date), day)
          ) || [];

          return (
            <Card key={day.toISOString()} className="min-h-[200px]">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground uppercase">
                      {format(day, "EEE", { locale: es })}
                    </div>
                    <div className={`text-lg ${isSameDay(day, new Date()) ? "text-primary font-bold" : ""}`}>
                      {format(day, "d")}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
                <CardContent className="p-2 space-y-1">
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-colors"
                    style={{ backgroundColor: getStatusBgColor(apt.status), color: '#fff' }}
                    onClick={() => {
                      setSelectedAppointment(apt);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="font-medium truncate">
                      {format(new Date(apt.appointment_date), "HH:mm")}
                    </div>
                    <div className="truncate opacity-90">
                      {apt.patient.full_name}
                    </div>
                  </div>
                ))}
                </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayAppointments = appointments?.filter((apt) =>
            isSameDay(new Date(apt.appointment_date), day)
          ) || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <Card
              key={day.toISOString()}
              className={`min-h-[100px] ${!isCurrentMonth ? "opacity-40" : ""}`}
            >
              <CardContent className="p-2">
                <div
                  className={`text-sm font-medium mb-1 ${
                    isSameDay(day, new Date()) ? "text-primary font-bold" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-colors truncate"
                      style={{ backgroundColor: getStatusBgColor(apt.status), color: '#fff' }}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setDialogOpen(true);
                      }}
                    >
                      {apt.patient.full_name}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 3} más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Citas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión del calendario de citas médicas
          </p>
        </div>
        <Button onClick={() => {
          setSelectedAppointment(undefined);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xl font-semibold">
              {view === "day" && format(currentDate, "d 'de' MMMM, yyyy", { locale: es })}
              {view === "week" && `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })}`}
              {view === "month" && format(currentDate, "MMMM yyyy", { locale: es })}
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")}>
              <TabsList>
                <TabsTrigger value="day">Hoy</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mes</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {view === "day" && renderDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </CardContent>
      </Card>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Appointments;
