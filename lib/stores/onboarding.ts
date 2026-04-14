import { SupabaseClient } from "@supabase/supabase-js";
import type { StoreOnboardingTask } from "@/types/database";

interface OnboardingTaskDef {
  task_key: string;
  title: string;
  description: string;
}

const DEFAULT_ONBOARDING_TASKS: OnboardingTaskDef[] = [
  {
    task_key: "add_logo",
    title: "Upload your logo",
    description: "Add your brand logo to personalize your store",
  },
  {
    task_key: "add_products",
    title: "Add your first product",
    description: "Create at least one product to display in your store",
  },
  {
    task_key: "configure_theme",
    title: "Customize your theme",
    description: "Set colors, fonts, and layout to match your brand",
  },
  {
    task_key: "set_shipping",
    title: "Set up shipping",
    description: "Configure shipping methods and rates",
  },
  {
    task_key: "connect_payments",
    title: "Connect payment processing",
    description: "Link your Stripe account to accept payments",
  },
  {
    task_key: "add_store_info",
    title: "Complete store information",
    description: "Add your store description, contact details, and policies",
  },
  {
    task_key: "preview_store",
    title: "Preview your store",
    description: "Review how your store looks before going live",
  },
  {
    task_key: "publish_store",
    title: "Publish your store",
    description: "Make your store visible to customers",
  },
];

export async function createDefaultOnboardingTasks(
  supabase: SupabaseClient,
  storeId: string,
  assignedTo?: string
): Promise<StoreOnboardingTask[]> {
  const tasks = DEFAULT_ONBOARDING_TASKS.map((task) => ({
    store_id: storeId,
    task_key: task.task_key,
    title: task.title,
    description: task.description,
    assigned_to: assignedTo || null,
  }));

  const { data, error } = await supabase
    .from("store_onboarding_tasks")
    .upsert(tasks, { onConflict: "store_id,task_key" })
    .select("*");

  if (error) throw error;
  return (data || []) as StoreOnboardingTask[];
}

export async function completeOnboardingTask(
  supabase: SupabaseClient,
  storeId: string,
  taskKey: string
): Promise<void> {
  const { error } = await supabase
    .from("store_onboarding_tasks")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("task_key", taskKey);

  if (error) throw error;

  // Check if all tasks are now completed
  const { data: remaining } = await supabase
    .from("store_onboarding_tasks")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_completed", false);

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("stores")
      .update({ onboarding_completed: true })
      .eq("id", storeId);
  }
}

export async function getOnboardingTasks(
  supabase: SupabaseClient,
  storeId: string
): Promise<StoreOnboardingTask[]> {
  const { data, error } = await supabase
    .from("store_onboarding_tasks")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at");

  if (error) throw error;
  return (data || []) as StoreOnboardingTask[];
}

export function getOnboardingProgress(tasks: StoreOnboardingTask[]) {
  if (tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
  const completed = tasks.filter((t) => t.is_completed).length;
  return {
    completed,
    total: tasks.length,
    percentage: Math.round((completed / tasks.length) * 100),
  };
}
