"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import type { Store } from "@/types/database";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadStore() {
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

      setStore(stores[0] as Store);
      setLoading(false);
    }

    loadStore();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <DashboardSidebar storeName={store?.name} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
