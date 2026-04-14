"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeOnboardingTask } from "@/lib/stores/onboarding";
import type {
  Store,
  Profile,
  StoreOnboardingTask,
  StoreBillingSettings,
  Order,
  PlanLimit,
} from "@/types/database";
import { StoreStatusBadge } from "@/components/admin/StoreStatusBadge";
import { OnboardingChecklist } from "@/components/admin/OnboardingChecklist";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Plus,
  Eye,
  Palette,
  CreditCard,
  Clock,
  TrendingUp,
  Percent,
  Calendar,
  RefreshCcw,
  Truck,
  CheckCircle2,
} from "lucide-react";

interface DashboardStats {
  productCount: number;
  orderCount: number;
  totalRevenue: number;
  customerCount: number;
  ordersToday: number;
  productsInStock: number;
  lowStockCount: number;
  activeDiscounts: number;
  salesData: { date: string; amount: number }[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-primary/5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className="flex items-center text-xs font-medium text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              {trend}
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[400px] lg:col-span-2" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    productCount: 0,
    orderCount: 0,
    totalRevenue: 0,
    customerCount: 0,
    ordersToday: 0,
    productsInStock: 0,
    lowStockCount: 0,
    activeDiscounts: 0,
    salesData: [],
  });
  const [tasks, setTasks] = useState<StoreOnboardingTask[]>([]);
  const [billing, setBilling] = useState<StoreBillingSettings | null>(null);
  const [planLimit, setPlanLimit] = useState<PlanLimit | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const loadDashboard = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: stores } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!stores || stores.length === 0) {
      router.push("/login");
      return;
    }

    const currentStore = stores[0] as Store;
    setStore(currentStore);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileData) setProfile(profileData as Profile);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      productsResult,
      ordersResult,
      customersResult,
      tasksResult,
      billingResult,
      recentOrdersResult,
      discountsResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, stock")
        .eq("store_id", currentStore.id),
      supabase
        .from("orders")
        .select("id, total, created_at, status")
        .eq("store_id", currentStore.id),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", currentStore.id),
      supabase
        .from("store_onboarding_tasks")
        .select("*")
        .eq("store_id", currentStore.id)
        .order("created_at"),
      supabase
        .from("store_billing_settings")
        .select("*")
        .eq("store_id", currentStore.id)
        .single(),
      supabase
        .from("orders")
        .select("*")
        .eq("store_id", currentStore.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("discounts")
        .select("id")
        .eq("store_id", currentStore.id)
        .eq("is_active", true),
    ]);

    // Process Orders for Trends
    const orders = ordersResult.data || [];
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const ordersToday = orders.filter(o => new Date(o.created_at) >= startOfToday).length;

    // Process Products for Stock
    const products = productsResult.data || [];
    const inStockCount = products.filter(p => (p.stock || 0) > 0).length;
    const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;

    // Create Chart Data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesByDay[d.toISOString().split('T')[0]] = 0;
    }

    orders.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (salesByDay[day] !== undefined) {
        salesByDay[day] += (o.total || 0);
      }
    });

    const salesData = Object.entries(salesByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setStats({
      productCount: products.length,
      orderCount: orders.length,
      totalRevenue,
      customerCount: customersResult.count ?? 0,
      ordersToday,
      productsInStock: inStockCount,
      lowStockCount,
      activeDiscounts: discountsResult.data?.length ?? 0,
      salesData,
    });

    if (tasksResult.data)
      setTasks(tasksResult.data as StoreOnboardingTask[]);
    if (billingResult.data)
      setBilling(billingResult.data as StoreBillingSettings);
    if (recentOrdersResult.data)
      setRecentOrders(recentOrdersResult.data as Order[]);

    let latestEventPlan = null;
    try {
      const { data: eventData } = await supabase
        .from("subscription_events")
        .select("plan_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (eventData) latestEventPlan = eventData.plan_name;
    } catch (e) { }

    const currentPlan = latestEventPlan ||
      billingResult.data?.plan_name ||
      profileData?.subscription_plan ||
      "Free";

    if (currentPlan && currentPlan !== "Free") {
      const { data: limitData } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan_name", currentPlan)
        .single();
      if (limitData) setPlanLimit(limitData as PlanLimit);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleToggleTask = useCallback(
    async (taskKey: string, completed: boolean) => {
      if (!store) return;
      if (completed) {
        await completeOnboardingTask(supabase, store.id, taskKey);
      } else {
        await supabase
          .from("store_onboarding_tasks")
          .update({ is_completed: false, completed_at: null })
          .eq("store_id", store.id)
          .eq("task_key", taskKey);
      }
      const { data } = await supabase
        .from("store_onboarding_tasks")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at");
      if (data) setTasks(data as StoreOnboardingTask[]);
    },
    [store, supabase]
  );

  if (loading) return <DashboardSkeleton />;

  if (!store) return null;

  const trialDaysRemaining = store.trial_ends_at
    ? Math.max(
      0,
      Math.ceil(
        (new Date(store.trial_ends_at).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
      )
    )
    : null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: store.currency || "GBP",
    }).format(amount);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text">
            Dashboard Overview
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Welcome back! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="Last 30 days"
          icon={DollarSign}
        />
        <StatCard
          title="Orders Today"
          value={stats.ordersToday.toString()}
          subtitle="Today"
          icon={ShoppingCart}
        />
        <StatCard
          title="Products in Stock"
          value={stats.productsInStock.toString()}
          subtitle={`${stats.lowStockCount} low stock alerts`}
          icon={Package}
        />
        <StatCard
          title="Active Discounts"
          value={stats.activeDiscounts.toString()}
          subtitle="Current promotions"
          icon={Percent}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Sales Trends</CardTitle>
                <CardDescription>
                  Revenue over the last 30 days
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                  }}
                  minTickGap={30}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `£${val}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  labelFormatter={(str) => new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground italic">
                No orders yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate italic">
                        #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        {new Date(order.created_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold">
                        {formatCurrency(order.total)}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4 text-xs font-bold" asChild>
              <Link href="/dashboard/orders">
                View All Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Onboarding Checklist */}
        {tasks.length > 0 && !store.onboarding_completed && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Setup Your Store</CardTitle>
              </div>
              <CardDescription>
                Complete these steps to get your store ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingChecklist tasks={tasks} onToggle={handleToggleTask} />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Quick Setup</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "New Product", href: "/dashboard/products/new", icon: Package },
              { label: "Edit Theme", href: "/dashboard/theme", icon: Palette },
              { label: "Shipping", href: "/dashboard/settings/shipping", icon: Truck },
              { label: "Discounts", href: "/dashboard/discounts", icon: Percent },
            ].map((action) => (
              <Button key={action.label} variant="outline" className="h-auto py-3 flex-col gap-2 rounded-xl" asChild>
                <Link href={action.href}>
                  <action.icon className="h-4 w-4" />
                  <span className="text-xs">{action.label}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
