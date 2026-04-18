"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Plus, X, Loader2, Trash2, PlusCircle } from "lucide-react";
import { ImageUpload } from "@/components/dashboard/ImageUpload";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircle, CheckCircle2, GripVertical, Image as ImageIcon, Sparkles } from "lucide-react";
import { 
  hasVariants as checkHasVariants, 
  getTotalVariantStock 
} from "@/lib/commerce/productUtils";
import type { Category, Store } from "@/types/database";

const optionValueSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, "Option value is required"),
});

const optionGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Option name is required"),
  values: z.array(optionValueSchema).min(1, "At least one value is required"),
});

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  compare_at_price: z.coerce
    .number()
    .min(0)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  stock: z.coerce.number().int().min(0, "Stock must be non-negative"),
  image_url: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  option_values: z.record(z.string(), z.string()), // { option_group_name: value }
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price must be positive"),
  compare_at_price: z.coerce
    .number()
    .min(0)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  stock_quantity: z.coerce.number().int().min(0, "Stock must be non-negative"),
  category_id: z.string().optional().or(z.literal("")),
  category_ids: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string().url("Must be a valid URL") })),
  option_groups: z.array(optionGroupSchema).default([]),
  variants: z.array(variantSchema).default([]),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      compare_at_price: undefined,
      stock_quantity: 0,
      category_id: "",
      category_ids: [],
      images: [],
      option_groups: [],
      variants: [],
      is_active: true,
    },
  });

  const variantCountPreview = useMemo(() => {
    const groups = form.watch("option_groups") || [];
    const validGroups = groups.filter(g => g.values && g.values.length > 0);
    if (validGroups.length === 0) return 0;
    return validGroups.reduce((acc, g) => acc * g.values.length, 1);
  }, [form.watch("option_groups")]);

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({ control: form.control, name: "images" });

  const {
    fields: optionGroupFields,
    append: appendOptionGroup,
    remove: removeOptionGroup,
  } = useFieldArray({ control: form.control, name: "option_groups" });

  const {
    fields: variantFields,
    replace: replaceVariants,
    remove: removeVariant,
  } = useFieldArray({ control: form.control, name: "variants" });

  const watchedVariants = useWatch({
    control: form.control,
    name: "variants",
  }) || [];
  const currentVariantCount = watchedVariants.length;

  useEffect(() => {
    async function init() {
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

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .or(`store_id.eq.${currentStore.id},store_id.is.null`)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (cats) setCategories(cats as Category[]);
      setLoading(false);
    }

    init();
  }, [supabase, router]);

  const generateVariants = () => {
    const groups = form.getValues("option_groups");
    if (groups.length === 0) {
      toast.error("Please add at least one option group.");
      return;
    }

    const validGroups = groups.filter((g) => g.values.length > 0);
    if (validGroups.length === 0) {
      toast.error("Please add at least one value to your options.");
      return;
    }

    const combinations: Record<string, string>[] = [];
    function cartesian(groupIndex: number, currentCombination: Record<string, string>) {
      if (groupIndex === validGroups.length) {
        combinations.push({ ...currentCombination });
        return;
      }
      validGroups[groupIndex].values.forEach((val) => {
        currentCombination[validGroups[groupIndex].name] = val.value;
        cartesian(groupIndex + 1, currentCombination);
      });
    }

    cartesian(0, {});

    const basePrice = form.getValues("price");
    const currentVariants = form.getValues("variants");

    const newVariants = combinations.map((combo) => {
      const existing = currentVariants.find((v) => {
        const comboEntries = Object.entries(combo);
        const variantEntries = Object.entries(v.option_values);
        if (comboEntries.length !== variantEntries.length) return false;
        return comboEntries.every(([name, value]) => v.option_values[name] === value);
      });

      if (existing) return existing;

      return {
        sku: "",
        price: basePrice,
        compare_at_price: undefined,
        stock: 0,
        image_url: "",
        is_active: true,
        is_default: false,
        option_values: combo,
      };
    });

    replaceVariants(newVariants);
    toast.success(`Generated ${newVariants.length} variants.`);
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!store) return;
    setSubmitting(true);

    try {
      // 1. Insert Product
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          store_id: store.id,
          name: values.name,
          description: values.description || null,
          price: values.price,
          compare_at_price: values.compare_at_price || null,
          stock: values.stock_quantity,
          category_id: values.category_ids?.[0] || null,
          image_url: values.images?.[0]?.url || null,
          image_urls: values.images.map((img) => img.url),
          active: values.is_active,
          variants: null, // Clear legacy JSON variants
        })
        .select("id")
        .single();

      if (error) throw error;

      // 2. Insert categories
      if (values.category_ids && values.category_ids.length > 0) {
        const categoryLinks = values.category_ids.map((catId) => ({
          product_id: product.id,
          category_id: catId,
        }));
        await supabase.from("product_categories").insert(categoryLinks);
      }

      // 3. Insert Options and Variants
      if (values.option_groups.length > 0) {
        for (let i = 0; i < values.option_groups.length; i++) {
          const og = values.option_groups[i];
          const { data: groupData, error: ogError } = await supabase
            .from("product_option_groups")
            .insert({
              product_id: product.id,
              name: og.name,
              position: i,
            })
            .select()
            .single();

          if (ogError) throw ogError;

          const valuesToInsert = og.values.map(v => ({
            option_group_id: groupData.id,
            value: v.value,
          }));

          const { error: ovError } = await supabase
            .from("product_option_values")
            .insert(valuesToInsert);

          if (ovError) throw ovError;
        }

        // Re-fetch option values to get their IDs
        const { data: allOptionValues } = await supabase
          .from("product_option_values")
          .select("id, value, group:product_option_groups(name)")
          .in("option_group_id", (
            await supabase.from("product_option_groups").select("id").eq("product_id", product.id)
          ).data?.map(g => g.id) || []);

        // Insert Variants
        for (const v of values.variants) {
          const { data: variantData, error: vError } = await supabase
            .from("product_variants")
            .insert({
              product_id: product.id,
              sku: v.sku || null,
              price: v.price,
              compare_at_price: v.compare_at_price || null,
              stock: v.stock,
              image_url: v.image_url || null,
              active: v.is_active,
              is_default: v.is_default,
            })
            .select()
            .single();

          if (vError) throw vError;

          const variantOptionsToInsert = Object.entries(v.option_values).map(([groupName, valueName]) => {
            const ov = allOptionValues?.find(ov => (ov.group as any).name === groupName && ov.value === valueName);
            return ov ? { variant_id: variantData.id, option_value_id: ov.id } : null;
          }).filter(Boolean);

          if (variantOptionsToInsert.length > 0) {
            const { error: voError } = await supabase
              .from("product_variant_options")
              .insert(variantOptionsToInsert);
            if (voError) throw voError;
          }
        }
      }

      toast.success("Product created!");
      router.push("/dashboard/products");
    } catch (err: any) {
      console.error("Creation error:", err);
      toast.error(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FormSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Product</h1>
          <p className="text-sm text-muted-foreground">
            Create a new product for your store
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {variantFields.length > 0 ? (
          <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Variant Product
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground font-normal">
            Simple Product
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form validation errors:", errors);
          toast.error("Please fill out all required fields correctly.");
        })} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Details */}
            <div className="space-y-6 lg:col-span-2">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your product..."
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Images</CardTitle>
                  <CardDescription>
                    These are the default images for your product.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            value={(field.value || []).map((img: any) => img.url)}
                            disabled={submitting}
                            onChange={(urls) => field.onChange(urls.map(url => ({ url })))}
                            onRemove={(url) =>
                              field.onChange(
                                (field.value || []).filter((val: any) => val.url !== url)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Variants Setup Builder */}
              <Card className="border-2 border-primary/10 overflow-hidden shadow-md">
                <CardHeader className="bg-primary/[0.02] border-b">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-primary/40" />
                        Variants Setup
                      </CardTitle>
                      <CardDescription className="text-[13px] mt-1 pr-4">
                        Create product choices like size or color, then generate all variant combinations automatically.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-10 pt-8">
                  {/* Step 1 & 2 Section */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
                      <div>
                        <h3 className="text-base font-bold">Step 1 — Add options</h3>
                        <p className="text-[12px] text-muted-foreground">What choices does this product come in? (e.g. Size, Color, Material)</p>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      {optionGroupFields.map((field, index) => (
                        <div key={field.id} className="relative group space-y-6 rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-primary/30">
                          <button
                            type="button"
                            onClick={() => removeOptionGroup(index)}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background border shadow-sm flex items-center justify-center text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="space-y-6">
                            {/* Option Name */}
                            <FormField
                              control={form.control}
                              name={`option_groups.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[13px] font-bold">Option Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Size" className="bg-muted/30 focus-visible:ring-primary/30" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Choices Section */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-[13px] font-bold">Step 2 — Add choices for each option</FormLabel>
                                <span className="text-[11px] text-muted-foreground italic">Size Example: Small, Medium, Large</span>
                              </div>
                              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 rounded-lg border-2 border-dashed bg-muted/10 items-center">
                                {(form.watch(`option_groups.${index}.values`) || []).map((val, valIndex) => (
                                  <Badge key={valIndex} variant="secondary" className="gap-1.5 px-3 py-1.5 text-[12px] bg-white border border-primary/10 shadow-sm animate-in fade-in zoom-in duration-200">
                                    {val.value}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentValues = form.getValues(`option_groups.${index}.values`);
                                        form.setValue(
                                          `option_groups.${index}.values`,
                                          currentValues.filter((_, i) => i !== valIndex)
                                        );
                                      }}
                                      className="ml-1 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                
                                {(!form.watch(`option_groups.${index}.values`) || form.watch(`option_groups.${index}.values`).length === 0) && (
                                  <span className="text-[12px] text-muted-foreground/60 italic px-2">No choices added yet</span>
                                )}

                                <Input
                                  placeholder="Type a choice and press Enter"
                                  className="h-9 w-48 border-none bg-transparent shadow-none focus-visible:ring-0 text-[13px] placeholder:text-muted-foreground/50"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = e.currentTarget.value.trim();
                                      if (val) {
                                        const currentValues = form.getValues(`option_groups.${index}.values`) || [];
                                        if (!currentValues.some(v => v.value === val)) {
                                          form.setValue(`option_groups.${index}.values`, [...currentValues, { value: val }]);
                                        }
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {optionGroupFields.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <PlusCircle className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Start by adding your first product option</p>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed py-6 hover:bg-primary/[0.02]"
                        onClick={() => appendOptionGroup({ name: "", values: [] })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option (e.g. Size or Color)
                      </Button>
                    </div>
                  </div>

                  {/* Step 3 Action */}
                  {optionGroupFields.length > 0 && (
                    <div className="pt-8 border-t space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-sm">3</div>
                        <div>
                          <h3 className="text-base font-bold">Step 3 — Create all variants</h3>
                          <p className="text-[12px] text-muted-foreground">We&apos;ll automatically create every possible combination (like Brown / Small).</p>
                        </div>
                      </div>

                      <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.03] via-primary/[0.01] to-background p-8 rounded-2xl border border-primary/10 shadow-sm">
                        {/* Decorative background element */}
                        <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-primary/5 rounded-full blur-3xl" />
                        
                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                             <div className="relative">
                               <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg animate-pulse" />
                               <div className="relative flex flex-col items-center justify-center p-4 min-w-[100px] h-[100px] bg-white rounded-2xl border-2 border-primary/10 shadow-xl">
                                 <span className="text-4xl font-black tabular-nums text-primary tracking-tighter">{variantCountPreview}</span>
                                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Variants</span>
                               </div>
                             </div>
                             
                             <div className="space-y-1 text-center md:text-left">
                               <p className="text-sm font-bold text-foreground">
                                 {currentVariantCount > 0 && currentVariantCount === variantCountPreview 
                                   ? "Variants Up to Date!" 
                                   : "Ready to generate?"}
                               </p>
                               <p className="text-[13px] text-muted-foreground max-w-[220px] leading-relaxed">
                                 {currentVariantCount > 0 && currentVariantCount === variantCountPreview
                                  ? "All combinations are active and ready to manage below."
                                  : variantCountPreview > 0 
                                    ? `We'll instantly create ${variantCountPreview} unique combinations for you.`
                                    : "Add choices above to reveal the magic."}
                               </p>
                             </div>
                          </div>

                          <Button
                            type="button"
                            className={`relative group h-16 px-10 rounded-2xl font-bold gap-3 transition-all ${
                              currentVariantCount > 0 && currentVariantCount === variantCountPreview
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)]"
                              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_20px_-10px_rgba(var(--primary),0.5)] hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                            onClick={generateVariants}
                            disabled={variantCountPreview === 0 || (currentVariantCount > 0 && currentVariantCount === variantCountPreview)}
                          >
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span className="text-lg">
                              {currentVariantCount > 0 && currentVariantCount === variantCountPreview
                                ? "Already Sync'd"
                                : "Create All Variants"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Variant Table */}
              {variantFields.length > 0 && optionGroupFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variants</CardTitle>
                    <CardDescription>
                      Manage price, stock, and details for each combination.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Combination</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Compare At</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead className="w-[70px] text-center">Def.</TableHead>
                            <TableHead className="w-[70px] text-center">Active</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variantFields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(form.watch(`variants.${index}.option_values`)).map(([group, val]) => (
                                    <Badge key={group} variant="outline" className="text-[10px] font-normal">
                                      {val}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 text-xs min-w-[80px]"
                                  {...form.register(`variants.${index}.sku`)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 w-20 text-xs"
                                  {...form.register(`variants.${index}.price`)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 w-20 text-xs"
                                  {...form.register(`variants.${index}.compare_at_price`)}
                                  value={form.watch(`variants.${index}.compare_at_price`) ?? ""}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="h-8 w-16 text-xs"
                                  {...form.register(`variants.${index}.stock`)}
                                />
                              </TableCell>
                              <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button 
                                      type="button"
                                      className="h-10 w-10 rounded border bg-muted flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
                                    >
                                      {form.watch(`variants.${index}.image_url`) ? (
                                        <img 
                                          src={form.watch(`variants.${index}.image_url`)} 
                                          alt="" 
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[200px] p-2 space-y-2">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground px-1">Product Images</p>
                                    <div className="grid grid-cols-4 gap-1">
                                      {(form.watch("images") || []).map((img: any) => (
                                        <button
                                          key={img.url}
                                          type="button"
                                          onClick={() => form.setValue(`variants.${index}.image_url`, img.url)}
                                          className="h-8 w-8 rounded overflow-hidden border hover:border-primary transition-all"
                                        >
                                          <img src={img.url} className="h-full w-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                    <div className="pt-2 border-t mt-2">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-[10px] h-6"
                                        onClick={() => form.setValue(`variants.${index}.image_url`, "")}
                                      >
                                        Clear Image
                                      </Button>
                                    </div>

                                    {/* Smart "Apply to all Color" Action */}
                                    {Object.entries(form.watch(`variants.${index}.option_values`)).map(([group, val]) => (
                                        <Button
                                          key={group}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-[9px] h-7 bg-primary/[0.03] gap-1 hover:bg-primary/10 hover:text-primary transition-all border-dashed"
                                          onClick={() => {
                                          const currentImg = form.getValues(`variants.${index}.image_url`);
                                          if (!currentImg) return;
                                          variantFields.forEach((v, i) => {
                                            const vOptions = form.getValues(`variants.${i}.option_values`);
                                            if (vOptions[group] === val) {
                                              form.setValue(`variants.${i}.image_url`, currentImg);
                                            }
                                          });
                                          toast.success(`Image applied to all ${val} variants`);
                                        }}
                                        >
                                          <Sparkles className="h-2.5 w-2.5" />
                                          Apply to all {val}
                                        </Button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  className="scale-75"
                                  checked={form.watch(`variants.${index}.is_default`)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      variantFields.forEach((_, i) => {
                                        form.setValue(`variants.${i}.is_default`, i === index);
                                      });
                                    } else {
                                      form.setValue(`variants.${index}.is_default`, false);
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  className="scale-75"
                                  checked={form.watch(`variants.${index}.is_active`)}
                                  onCheckedChange={(checked) => form.setValue(`variants.${index}.is_active`, checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeVariant(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Pricing, Status */}
            <div className="space-y-6">
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="compare_at_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare at Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Inventory */}
              <Card className={variantFields.length > 0 ? "opacity-60 bg-muted/20" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            {...field}
                            disabled={variantFields.length > 0}
                          />
                        </FormControl>
                        {variantFields.length > 0 && (
                          <div className="flex items-start gap-2 mt-2 p-2 rounded bg-blue-50/50 border border-blue-100 text-[11px] text-blue-700">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <p>
                              Variants are active. Sellable stock is managed per variant. 
                              Base stock acts as a fallback or overall reference.
                            </p>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Organization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={categories.map((cat) => ({
                              label: cat.name,
                              value: cat.id,
                            }))}
                            selected={field.value || []}
                            onChange={(vals) => field.onChange(vals)}
                            placeholder="Select categories"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel className="text-base">Active</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Make this product visible in your store
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/products")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
