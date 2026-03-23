"use client";

// 商品追加・編集フォーム（管理画面）
// 基本情報 → 属性設定 → バリアント生成 → 価格設定 の順で入力する

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Zap, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Category, Stage, ProductVariant, VariantPrice } from "@/types";
import { apiGet, apiPost, apiPut } from "@/lib/utils/apiClient";
import { formatAttributeValues, formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import ImageUpload from "./ImageUpload";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  category_id: z.string().min(1, "カテゴリは必須です"),
  category_name: z.string().min(1),
  product_type: z.enum(["apparel", "accessory", "non_apparel"]),
  description: z.string(),
  image_url: z.string().nullable().optional(),
  retail_price: z.number().min(0).nullable().optional(),
  sort_order: z.number().int().min(0),
});
type ProductForm = z.infer<typeof productSchema>;




interface AttributeInput {
  id: string; // ローカル管理用
  name: string;
  options: string[];
  newOption: string;
}

interface ProductFormPageProps {
  productId?: string; // 編集時のみ
}

export default function ProductFormPage({ productId }: ProductFormPageProps) {
  const router = useRouter();
  const isEditing = !!productId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [attributes, setAttributes] = useState<AttributeInput[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(productId ?? null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category_id: "",
      category_name: "",
      product_type: "apparel",
      description: "",
      image_url: "",
      sort_order: 0,
    },
});


  const watchedCategoryId = watch("category_id");

  // 選択中カテゴリに応じてcategory_nameを自動設定する
  useEffect(() => {
    const cat = categories.find((c) => c.id === watchedCategoryId);
    if (cat) setValue("category_name", cat.name);
  }, [watchedCategoryId, categories, setValue]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [cats, stgs] = await Promise.all([
        apiGet<Category[]>("/api/admin/categories"),
        apiGet<Stage[]>("/api/admin/stages"),
      ]);
      setCategories(cats);
      setStages(stgs.filter((s) => s.is_active));
      return { cats, stgs: stgs.filter((s) => s.is_active) };
    } catch {
      toast.error("マスタデータの取得に失敗しました");
      return null;
    }
  }, []);

  const fetchProductDetail = useCallback(async (currentStages: Stage[]) => {
    if (!productId) return;
    try {
      const data = await apiGet<any>(`/api/admin/products/${productId}`);
      
      // 基本情報のセット
      setValue("name", data.name);
      setValue("category_id", data.category_id);
      setValue("category_name", data.category_name);
      setValue("product_type", data.product_type);
      setValue("description", data.description || "");
      setValue("image_url", data.image_url || "");
      setValue("retail_price", data.retail_price);
      setValue("sort_order", data.sort_order);

      // 属性のセット
      if (data.attributes) {
        setAttributes(data.attributes.map((attr: any) => ({
          id: attr.id,
          name: attr.name,
          options: attr.options.map((opt: any) => opt.name),
          newOption: ""
        })));
      }

      // バリアントと価格のセット
      if (data.variants) {
        setVariants(data.variants);
        const initialPrices: Record<string, Record<string, number>> = {};
        data.variants.forEach((v: any) => {
          initialPrices[v.id] = {};
          currentStages.forEach((s) => {
            const priceObj = v.prices?.find((p: any) => p.stage_id === s.id);
            initialPrices[v.id][s.id] = priceObj ? priceObj.wholesale_price : 0;
          });
        });
        setPrices(initialPrices);
      }
    } catch {
      toast.error("商品情報の取得に失敗しました");
    }
  }, [productId, setValue]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const master = await fetchMasterData();
      if (master) {
        await fetchProductDetail(master.stgs);
      }
      setIsLoading(false);
    };
    init();
  }, [fetchMasterData, fetchProductDetail]);

  const [isLoading, setIsLoading] = useState(true);


  // --- 属性操作 ---
  const addAttribute = () => {
    setAttributes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", options: [], newOption: "" },
    ]);
  };

  const updateAttributeName = (id: string, name: string) => {
    setAttributes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name } : a))
    );
  };

  const addOption = (id: string) => {
    setAttributes((prev) =>
      prev.map((a) => {
        if (a.id !== id || !a.newOption.trim()) return a;
        if (a.options.includes(a.newOption.trim())) {
          toast.error("同じオプションが既に存在します");
          return a;
        }
        return {
          ...a,
          options: [...a.options, a.newOption.trim()],
          newOption: "",
        };
      })
    );
  };

  const removeOption = (attrId: string, option: string) => {
    setAttributes((prev) =>
      prev.map((a) =>
        a.id === attrId ? { ...a, options: a.options.filter((o) => o !== option) } : a
      )
    );
  };

  const removeAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  // --- バリアント生成 ---
  const generateVariants = async () => {
    if (!savedProductId) {
      toast.error("先に商品の基本情報を保存してください");
      return;
    }
    const validAttributes = attributes.filter((a) => a.name && a.options.length > 0);
    if (validAttributes.length === 0 && attributes.length > 0) {
      toast.error("属性名とオプションを入力してください");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await apiPost<{ generated_count: number; variants: ProductVariant[] }>(
        `/api/admin/products/${savedProductId}/variants/generate`,
        {
          attributes: validAttributes.map((a) => ({
            name: a.name,
            options: a.options,
          })),
        }
      );

      // 最新のバリアントを取得
      const productDetail = await apiGet<{ variants: ProductVariant[] }>(
        `/api/admin/products/${savedProductId}`
      );
      setVariants(productDetail.variants ?? []);

      // 価格マトリクスを初期化
      const initialPrices: Record<string, Record<string, number>> = {};
      (productDetail.variants ?? []).forEach((v) => {
        initialPrices[v.id] = {};
        stages.forEach((s) => {
          initialPrices[v.id][s.id] = 0;
        });
      });
      setPrices(initialPrices);

      toast.success(`${result.generated_count}件のバリアントを生成しました`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 価格入力 ---
  const updatePrice = (variantId: string, stageId: string, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {}), [stageId]: value },
    }));
  };

  // --- 価格一括保存 ---
  const savePrices = async () => {
    if (!savedProductId || variants.length === 0) return;
    setIsSavingPrices(true);
    try {
      await Promise.all(
        variants.map((variant) =>
          apiPut(
            `/api/admin/products/${savedProductId}/variants/${variant.id}/prices`,
            {
              prices: stages.map((stage) => ({
                stage_id: stage.id,
                stage_name: stage.name,
                wholesale_price: prices[variant.id]?.[stage.id] ?? 0,
              })),
            }
          )
        )
      );
      toast.success("価格を保存しました");
    } catch {
      toast.error("価格の保存に失敗しました");
    } finally {
      setIsSavingPrices(false);
    }
  };

  // --- 商品基本情報の保存 ---
  const onSubmit = async (data: any) => {
    try {
      if (isEditing && savedProductId) {
        await apiPut(`/api/admin/products/${savedProductId}`, data);
        toast.success("商品を更新しました");
      } else {
        const result = await apiPost<{ id: string }>("/api/admin/products", data);
        setSavedProductId(result.id);
        toast.success("商品を保存しました。次に属性とバリアントを設定してください。");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto page-enter">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/products"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          商品一覧に戻る
        </Link>
        <Separator orientation="vertical" className="h-5" />

        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          {isEditing ? "商品を編集" : "商品を追加"}
        </h1>
      </div>

      {/* ── 基本情報 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-6 pb-6 border-b border-border/50">
              <ImageUpload 
                value={watch("image_url") || ""} 
                onChange={(url) => setValue("image_url", url)} 
                productId={savedProductId || ""}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">商品名 *</Label>
                <Input id="product-name" placeholder="例: 半袖, ネックレス黒" {...register("name")} />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>カテゴリ *</Label>
                <Select
                  value={watchedCategoryId}
                  onValueChange={(v: unknown) => setValue("category_id", v as string)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.category_id && <p className="text-destructive text-xs">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>商品タイプ *</Label>
                <Select defaultValue="apparel" onValueChange={(v) => setValue("product_type", v as "apparel" | "accessory" | "non_apparel")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apparel">アパレル</SelectItem>
                    <SelectItem value="accessory">アクセサリー</SelectItem>
                    <SelectItem value="non_apparel">非アパレル</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retail-price">販売定価（円）</Label>
                <Input id="retail-price" type="number" min={0} placeholder="6000" {...register("retail_price", { valueAsNumber: true })} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">商品説明</Label>
                <Input id="description" placeholder="商品の説明を入力" {...register("description")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-order">表示順序</Label>
                <Input id="sort-order" type="number" min={0} {...register("sort_order", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "保存中..." : "基本情報を保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── 属性設定 ── */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">属性設定（バリエーション）</CardTitle>
          <Button variant="outline" size="sm" onClick={addAttribute}>
            <Plus className="w-4 h-4 mr-1" />
            属性を追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {attributes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              属性なしの場合はそのままバリアントを生成してください
            </p>
          ) : (
            attributes.map((attr, idx) => (
              <div key={attr.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-6">{idx + 1}.</span>
                  <Input
                    placeholder="属性名（例: カラー, サイズ）"
                    value={attr.name}
                    onChange={(e) => updateAttributeName(attr.id, e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive ml-auto"
                    onClick={() => removeAttribute(attr.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* オプション一覧 */}
                <div className="flex flex-wrap gap-2 ml-8">
                  {attr.options.map((opt) => (
                    <Badge
                      key={opt}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => removeOption(attr.id, opt)}
                    >
                      {opt} ×
                    </Badge>
                  ))}
                </div>

                {/* オプション追加入力 */}
                <div className="flex gap-2 ml-8">
                  <Input
                    placeholder="オプション値を入力（例: 白, S, 大ロゴ入り）"
                    value={attr.newOption}
                    onChange={(e) =>
                      setAttributes((prev) =>
                        prev.map((a) =>
                          a.id === attr.id ? { ...a, newOption: e.target.value } : a
                        )
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption(attr.id);
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => addOption(attr.id)}>
                    追加
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={generateVariants}
              disabled={isGenerating || !savedProductId}
              className="bg-accent hover:bg-accent/90 text-white btn-lift"
            >
              <Zap className="w-4 h-4 mr-2" />
              {isGenerating ? "生成中..." : "バリアントを生成"}
            </Button>
          </div>

          {!savedProductId && (
            <p className="text-muted-foreground text-xs text-right">
              ※ 先に基本情報を保存してからバリアントを生成できます
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── ステージ別価格設定 ── */}
      {variants.length > 0 && stages.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              ステージ別価格設定（FC卸）
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {variants.length}バリアント
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                      バリアント（属性値）
                    </th>
                    {stages.map((stage) => (
                      <th key={stage.id} className="text-center py-2 px-3 font-medium text-muted-foreground min-w-28">
                        {stage.name}（FC卸）
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr key={variant.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">
                        <span className="text-foreground">
                          {Object.keys(variant.attribute_values ?? {}).length > 0
                            ? formatAttributeValues(variant.attribute_values)
                            : "（バリアントなし）"}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {variant.sku_code}
                        </span>
                      </td>
                      {stages.map((stage) => (
                        <td key={stage.id} className="py-2 px-3 text-center">
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="w-24 mx-auto text-center tabular-nums"
                            value={prices[variant.id]?.[stage.id] ?? ""}
                            onChange={(e) =>
                              updatePrice(variant.id, stage.id, Number(e.target.value))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <p className="text-muted-foreground text-xs">
                ※ FC卸（卸価格）= 加盟店への卸売価格。販売定価・利益率は管理画面でのみ表示。
              </p>
              <Button
                onClick={savePrices}
                disabled={isSavingPrices}
                className="bg-primary hover:bg-primary/90"
              >
                {isSavingPrices ? "保存中..." : "価格を保存"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完了ボタン */}
      {savedProductId && (
        <div className="flex justify-end mt-6">
          <Link
            href="/admin/products"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            商品一覧に戻る
          </Link>
        </div>
      )}

    </div>
  );
}
