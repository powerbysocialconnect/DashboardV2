"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, X, Loader2, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/dashboard/ImageUpload";
import type { Product, Category, Store } from "@/types/database";

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
  images: z.array(z.object({ url: z.string().url("Must be a valid URL") })),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Variant name is required"),
      price: z.coerce.number().min(0, "Price must be positive"),
      stock: z.coerce.number().int().min(0, "Stock must be non-negative"),
    })
  ),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function EditProductSkeleton() {
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
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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

export default function EditProductPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
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
      images: [],
      variants: [],
      is_active: true,
    },
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({ control: form.control, name: "images" });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control: form.control, name: "variants" });

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

      const [productResult, catsResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("store_id", currentStore.id)
          .single(),
        supabase
          .from("categories")
          .select("*")
          .or(`store_id.eq.${currentStore.id},store_id.is.null`)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (catsResult.data) setCategories(catsResult.data as Category[]);

      if (productResult.error || !productResult.data) {
        setError("Product not found or you don't have permission to edit it.");
        setLoading(false);
        return;
      }

      const prod = productResult.data as Product;
      setProduct(prod);

      form.reset({
        name: prod.name,
        description: prod.description || "",
        price: prod.price,
        compare_at_price: prod.compare_at_price ?? undefined,
        stock_quantity: prod.stock,
        category_id: prod.category_id || "",
        images: (prod.image_urls || []).map((url) => ({ url })),
        variants: (prod.variants || []).map((v) => ({
          id: (v as any).id,
          name: v.name,
          price: (v as any).price || prod.price,
          stock: (v as any).stock || 0,
        })),
        is_active: prod.active,
      });

      setLoading(false);
    }

    init();
  }, [supabase, router, productId, form]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!store || !product) return;
    setSubmitting(true);

    const variants =
      values.variants.length > 0
        ? values.variants.map((v) => ({
            id: v.id || crypto.randomUUID(),
            name: v.name,
            price: v.price,
            stock: v.stock,
          }))
        : null;

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: values.name,
        description: values.description || null,
        price: values.price,
        compare_at_price: values.compare_at_price || null,
        stock: values.stock_quantity,
        category_id: (values.category_id && values.category_id !== "") ? values.category_id : null,
        image_url: values.images?.[0]?.url || null,
        image_urls: values.images.map((img) => img.url),
        variants,
        active: values.is_active,
      })
      .eq("id", product.id)
      .eq("store_id", store.id);

    if (updateError) {
      setError("Failed to update product. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/products");
  };

  const handleDelete = async () => {
    if (!store || !product) return;
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("store_id", store.id);

    if (deleteError) {
      setError("Failed to delete product. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/dashboard/products");
  };

  if (loading) return <EditProductSkeleton />;

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-sm text-muted-foreground">{product?.name}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{product?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form validation errors:", errors);
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

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Images</CardTitle>
                  <CardDescription>
                    Upload and manage product images.
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

              {/* Variants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variants</CardTitle>
                  <CardDescription>
                    Add variant options (e.g., Size: S, M, L, XL)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variantFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end"
                    >
                      <FormField
                        control={form.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-[2]">
                            <FormLabel>Variant Name (e.g. Blue / Small)</FormLabel>
                            <FormControl>
                              <Input placeholder="Variant name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.stock`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendVariant({ name: "", price: form.getValues("price"), stock: 0 })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variant
                  </Button>
                </CardContent>
              </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
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
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.parent_id && <span className="mr-1 opacity-50">↳</span>}
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  Save Changes
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
