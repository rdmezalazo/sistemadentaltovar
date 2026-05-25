import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  totalPatients: number;
  todayAppointments: number;
  monthlyIncome: number;
  pendingAccounts: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const INCOME_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];
const EXPENSE_COLORS = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyIncome: 0,
    pendingAccounts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [incomeData, setIncomeData] = useState<ChartData[]>([]);
  const [expenseData, setExpenseData] = useState<ChartData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedMonth]);

  const loadStats = async () => {
    try {
      // Get total patients
      const { count: patientsCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      // Get today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: appointmentsCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", today.toISOString())
        .lt("appointment_date", tomorrow.toISOString());

      // Get monthly income
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid")
        .gte("payment_date", firstDayOfMonth.toISOString());

      const monthlyIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Get pending accounts
      const { count: pendingCount } = await supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "partial"]);

      setStats({
        totalPatients: patientsCount || 0,
        todayAppointments: appointmentsCount || 0,
        monthlyIncome,
        pendingAccounts: pendingCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // Parse year and month correctly to avoid timezone issues
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1, 1));
      const endDate = endOfMonth(new Date(year, month - 1, 1));

      // Get income by payment method from cash_transactions
      const { data: incomeTransactions } = await supabase
        .from("cash_transactions")
        .select("amount, payment_method, category")
        .eq("transaction_type", "income")
        .gte("transaction_date", startDate.toISOString())
        .lte("transaction_date", endDate.toISOString());

      // Group income by payment method
      const incomeByMethod: Record<string, number> = {};
      incomeTransactions?.forEach((t) => {
        const method = t.payment_method || "Otro";
        incomeByMethod[method] = (incomeByMethod[method] || 0) + Number(t.amount);
      });

      const incomeChartData = Object.entries(incomeByMethod).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: INCOME_COLORS[index % INCOME_COLORS.length],
      }));

      setIncomeData(incomeChartData);
      setTotalIncome(incomeChartData.reduce((sum, d) => sum + d.value, 0));

      // Get expenses by category
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .lte("expense_date", endDate.toISOString().split("T")[0]);

      // Aggregate expenses by category
      const expenseCategories: Record<string, number> = {
        "Operatoria": 0,
        "Endodoncia": 0,
        "Ortodoncia": 0,
        "Implantes": 0,
        "Coronas": 0,
        "Equipos": 0,
        "Reparaciones": 0,
        "Limpieza": 0,
        "Salarios": 0,
        "Impuestos": 0,
        "Laboratorio": 0,
        "Servicios": 0,
        "Otros": 0,
      };

      expenses?.forEach((e) => {
        if (e.operatory) expenseCategories["Operatoria"] += Number(e.operatory);
        if (e.endodontics) expenseCategories["Endodoncia"] += Number(e.endodontics);
        if (e.orthodontics) expenseCategories["Ortodoncia"] += Number(e.orthodontics);
        if (e.implants) expenseCategories["Implantes"] += Number(e.implants);
        if (e.crowns) expenseCategories["Coronas"] += Number(e.crowns);
        if (e.equipment) expenseCategories["Equipos"] += Number(e.equipment);
        if (e.repairs) expenseCategories["Reparaciones"] += Number(e.repairs);
        if (e.cleaning) expenseCategories["Limpieza"] += Number(e.cleaning);
        if (e.salaries) expenseCategories["Salarios"] += Number(e.salaries);
        if (e.taxes) expenseCategories["Impuestos"] += Number(e.taxes);
        if (e.laboratory) expenseCategories["Laboratorio"] += Number(e.laboratory);
        if (e.services) expenseCategories["Servicios"] += Number(e.services);
        if (e.other) expenseCategories["Otros"] += Number(e.other);
      });

      const expenseChartData = Object.entries(expenseCategories)
        .filter(([, value]) => value > 0)
        .map(([name, value], index) => ({
          name,
          value,
          color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
        }));

      setExpenseData(expenseChartData);
      setTotalExpense(expenseChartData.reduce((sum, d) => sum + d.value, 0));
    } catch (error) {
      console.error("Error loading chart data:", error);
    }
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: es }),
    };
  });

  const statCards = [
    {
      title: "Total Pacientes",
      value: stats.totalPatients,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Citas Hoy",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-accent",
    },
    {
      title: "Ingresos del Mes",
      value: `S/. ${stats.monthlyIncome.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Cuentas Pendientes",
      value: stats.pendingAccounts,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Vista general del consultorio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Seleccionar Mes:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ingresos por Método de Pago</span>
              <span className="text-green-600 text-lg font-bold">
                S/ {totalIncome.toFixed(2)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`, "Monto"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos de ingresos para este mes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Egresos por Categoría</span>
              <span className="text-red-600 text-lg font-bold">
                S/ {totalExpense.toFixed(2)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`, "Monto"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos de egresos para este mes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <p className="text-sm text-muted-foreground">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-600">
                S/ {totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <p className="text-sm text-muted-foreground">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600">
                S/ {totalExpense.toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${totalIncome - totalExpense >= 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-orange-500/10 border-orange-500/30"}`}>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                S/ {(totalIncome - totalExpense).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;