import { Settings as SettingsIcon, DollarSign, CreditCard, Tag, CalendarCheck, MapPin, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentConceptsManager } from "@/components/settings/PaymentConceptsManager";
import { AppointmentStatusesManager } from "@/components/settings/AppointmentStatusesManager";
import { BranchesManager } from "@/components/settings/BranchesManager";
import { DoctorsManager } from "@/components/settings/DoctorsManager";
import { PaymentMethodsManager } from "@/components/settings/PaymentMethodsManager";
import { PaymentStatusesManager } from "@/components/settings/PaymentStatusesManager";

const Settings = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los conceptos de pago, métodos y configuraciones del sistema
        </p>
      </div>

      <Tabs defaultValue="concepts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="concepts" className="gap-2">
            <Tag className="h-4 w-4" />
            Conceptos de Pago
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="payment-status" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Estados de Pago
          </TabsTrigger>
          <TabsTrigger value="appointment-status" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Estados de Citas
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <MapPin className="h-4 w-4" />
            Sedes
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-2">
            <UserCog className="h-4 w-4" />
            Doctores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="concepts">
          <PaymentConceptsManager />
        </TabsContent>

        <TabsContent value="payment-methods">
          <PaymentMethodsManager />
        </TabsContent>

        <TabsContent value="payment-status">
          <PaymentStatusesManager />
        </TabsContent>

        <TabsContent value="appointment-status">
          <AppointmentStatusesManager />
        </TabsContent>

        <TabsContent value="branches">
          <BranchesManager />
        </TabsContent>

        <TabsContent value="doctors">
          <DoctorsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
