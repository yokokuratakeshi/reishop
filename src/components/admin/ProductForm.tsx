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
import { Plus, Trash2, Zap, ChevronLeft, Pencil, Check, X, Eye, EyeOff, CopyCheck } from "lucide-react";
import Link from "next/link";
import { Category, Stage, ProductVariant, VariantPrice } from "@/types";
import { apiGet, apiPost, apiPut, apiPatch } from "@/lib/utils/apiClient";
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
  // 価格一括適用用の状態
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkTargetStages, setBulkTargetStages] = useState<Set<string>>(new Set());

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

  const addAttributeWithName = (name: string) => {
    if (attributes.some(a => a.name === name)) {
      toast.error(`すでに「${name}」は追加されています`);
      return;
    }
    setAttributes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, options: [], newOption: "" },
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
          return { ...a, newOption: "" };
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
      const result = await apiPost<{ generated_count: number; added_count: number; skipped_count: number; variants: ProductVariant[] }>(
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

      if (result.added_count > 0) {
        toast.success(`${result.added_count}件のバリアントを追加しました${result.skipped_count > 0 ? `（${result.skipped_count}件は既存のためスキップ）` : ""}`);
      } else if (result.skipped_count > 0) {
        toast.info(`すべてのバリアントが既に存在しています（${result.skipped_count}件）`);
      } else {
        toast.success("バリアントを生成しました");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- バリアント削除 ---
  const removeVariant = async (variantId: string) => {
    if (!savedProductId) return;
    if (!confirm("このバリアントを削除しますか？関連する価格データも削除されます。")) return;

    try {
      await apiPost(`/api/admin/products/${savedProductId}/variants/${variantId}/delete`, {});
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      setPrices((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      toast.success("バリアントを削除しました");
    } catch {
      toast.error("バリアントの削除に失敗しました");
    }
  };

  // --- バリアント更新（SKU・有効/無効） ---
  const updateVariant = async (variantId: string, data: { sku_code?: string; is_active?: boolean }) => {
    if (!savedProductId) return;
    try {
      await apiPatch(`/api/admin/products/${savedProductId}/variants/${variantId}`, data);
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, ...data } : v))
      );
      toast.success("バリアントを更新しました");
    } catch {
      toast.error("バリアントの更新に失敗しました");
    }
  };

  // --- 価格入力 ---
  const updatePrice = (variantId: string, stageId: string, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {}), [stageId]: value },
    }));
  };

  // --- 価格一括適用（選択したステージ全バリアントに同じ価格を設定） ---
  const applyBulkPrice = () => {
    const priceValue = Number(bulkPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error("有効な価格を入力してください");
      return;
    }
    if (bulkTargetStages.size === 0) {
      toast.error("適用先のステージを選択してください");
      return;
    }
    setPrices((prev) => {
      const next = { ...prev };
      variants.forEach((v) => {
        next[v.id] = { ...(next[v.id] ?? {}) };
        bulkTargetStages.forEach((stageId) => {
          next[v.id][stageId] = priceValue;
        });
      });
      return next;
    });
    toast.success(`${bulkTargetStages.size}ステージ × ${variants.length}バリアントに一括適用しました`);
  };

  const toggleBulkStage = (stageId: string) => {
    setBulkTargetStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const selectAllBulkStages = () => {
    setBulkTargetStages(new Set(stages.map((s) => s.id)));
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" onKeyDown={(e) => {
            // Enterキーでのフォーム送信を防止（送信ボタンクリック時のみ送信）
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
              e.preventDefault();
            }
          }}>
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
                  onValueChange={(v) => setValue("category_id", v || "")}
                >
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="カテゴリを選択">
                      {categories.find(c => c.id === (watchedCategoryId || ""))?.name}
                    </SelectValue>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => addAttributeWithName("サイズ")}>
              <Plus className="w-3 h-3 mr-1" /> サイズ
            </Button>
            <Button variant="outline" size="sm" onClick={() => addAttributeWithName("カラー")}>
              <Plus className="w-3 h-3 mr-1" /> カラー
            </Button>
            <Button variant="outline" size="sm" onClick={() => addAttributeWithName("ロゴ")}>
              <Plus className="w-3 h-3 mr-1" /> ロゴ
            </Button>
            <Button variant="outline" size="sm" onClick={addAttribute}>
              <Plus className="w-3 h-3 mr-1" /> 任意属性
            </Button>
          </div>
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
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
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
            {/* 価格一括適用 */}
            <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CopyCheck className="w-4 h-4" />
                価格の一括適用
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  placeholder="一括適用する価格（円）"
                  className="w-48"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
                <span className="text-sm text-muted-foreground">→</span>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => toggleBulkStage(stage.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        bulkTargetStages.has(stage.id)
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {stage.name}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={selectAllBulkStages}
                  type="button"
                >
                  全選択
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={applyBulkPrice}
                type="button"
                disabled={!bulkPrice || bulkTargetStages.size === 0}
              >
                選択ステージに一括適用
              </Button>
            </div>

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
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr key={variant.id} className={cn("border-b border-border last:border-0", variant.is_active === false && "opacity-50")}>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">
                            {Object.keys(variant.attribute_values ?? {}).length > 0
                              ? formatAttributeValues(variant.attribute_values)
                              : "（バリアントなし）"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            defaultValue={variant.sku_code}
                            className="h-6 text-xs w-32 px-1.5 text-muted-foreground"
                            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                            onBlur={(e) => {
                              const newSku = e.target.value.trim();
                              if (newSku && newSku !== variant.sku_code) {
                                updateVariant(variant.id, { sku_code: newSku });
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 w-6 p-0",
                              variant.is_active === false
                                ? "text-muted-foreground hover:text-green-600"
                                : "text-green-600 hover:text-muted-foreground"
                            )}
                            onClick={() => updateVariant(variant.id, { is_active: !(variant.is_active ?? true) })}
                            title={variant.is_active === false ? "有効にする" : "無効にする"}
                          >
                            {variant.is_active === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
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
                            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                          />
                        </td>
                      ))}
                      <td className="py-2 pl-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                          onClick={() => removeVariant(variant.id)}
                          title="バリアントを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
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
