"use client";

// 商品一覧画面（管理画面）
// カテゴリ別グループ化 + ドラッグ&ドロップ並べ替え

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, ChevronDown, ChevronRight, GripVertical, Copy } from "lucide-react";
import { Product, Category } from "@/types";
import { apiGet, apiDelete, apiPost, apiPatch } from "@/lib/utils/apiClient";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CsvImportButton } from "@/components/admin/csv-import-button";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ソート可能な商品カード
function SortableProductCard({
  product,
  onDelete,
  onCopy,
}: {
  product: Product;
  onDelete: (p: Product) => void;
  onCopy: (p: Product) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* ドラッグハンドル */}
          <button
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground self-center"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* 商品画像 */}
          <div className="w-16 h-16 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={64}
                height={64}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* 商品情報 */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {product.name}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {product.category_name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {product.has_variants && (
                <Badge variant="outline" className="text-xs">
                  バリアントあり
                </Badge>
              )}
              {!product.is_active && (
                <Badge className="text-xs bg-neutral-400">非公開</Badge>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-blue-600"
            onClick={() => onCopy(product)}
            title="商品をコピー"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// カテゴリグループ内のDnDリスト
function CategoryGroupDnD({
  categoryName,
  categoryColor,
  products,
  collapsed,
  onToggle,
  onDelete,
  onCopy,
  onReorder,
}: {
  categoryName: string;
  categoryColor?: string;
  products: Product[];
  collapsed: boolean;
  onToggle: () => void;
  onDelete: (p: Product) => void;
  onCopy: (p: Product) => void;
  onReorder: (categoryProducts: Product[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const newProducts = arrayMove(products, oldIndex, newIndex);
    onReorder(newProducts);
  };

  return (
    <div className="space-y-3">
      {/* カテゴリヘッダー */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/50 rounded-lg transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        {categoryColor && (
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
        )}
        <span className="font-bold text-foreground">{categoryName}</span>
        <Badge variant="secondary" className="text-xs ml-1">
          {products.length}
        </Badge>
      </button>

      {/* 商品グリッド */}
      {!collapsed && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
              {products.map((product) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  onDelete={onDelete}
                  onCopy={onCopy}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        apiGet<Product[]>("/api/admin/products"),
        apiGet<Category[]>("/api/admin/categories"),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      toast.error("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`「${product.name}」を削除しますか？`)) return;
    try {
      await apiDelete(`/api/admin/products/${product.id}`);
      toast.success("商品を削除しました");
      fetchData();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleCopy = async (product: Product) => {
    if (!confirm(`「${product.name}」をコピーしますか？（属性・バリアント・価格も含む）`)) return;
    try {
      const result = await apiPost<{ id: string; name: string }>(
        `/api/admin/products/${product.id}/copy`,
        {}
      );
      toast.success(`「${result.name}」を作成しました`);
      fetchData();
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // フィルタリング
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchText === "" ||
      p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // カテゴリ別グループ化
  const groupedProducts = selectedCategory === "all" && !searchText
    ? (() => {
        const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);
        const groups = sortedCategories
          .map((cat) => ({
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            products: filteredProducts
              .filter((p) => p.category_id === cat.id)
              .sort((a, b) => a.sort_order - b.sort_order),
          }))
          .filter((g) => g.products.length > 0);

        // 未分類商品
        const uncategorized = filteredProducts.filter(
          (p) => !categories.find((c) => c.id === p.category_id)
        );
        if (uncategorized.length > 0) {
          groups.push({
            categoryId: "__uncategorized__",
            categoryName: "未分類",
            categoryColor: undefined,
            products: uncategorized.sort((a, b) => a.sort_order - b.sort_order),
          });
        }

        return groups;
      })()
    : null;

  // グループ内並べ替えハンドラ
  const handleGroupReorder = async (categoryId: string, newProducts: Product[]) => {
    // 並べ替え後のインデックスでローカルの sort_order を更新
    const updatedNewProducts = newProducts.map((p, i) => ({ ...p, sort_order: i }));

    // ローカル state を即時更新
    setProducts((prev) => {
      const otherProducts = prev.filter((p) => p.category_id !== categoryId);
      return [...otherProducts, ...updatedNewProducts];
    });

    // API に sort_order を保存
    const reorderData = updatedNewProducts.map((p) => ({ id: p.id, sort_order: p.sort_order }));
    try {
      await apiPatch("/api/admin/products/reorder", reorderData);
    } catch {
      toast.error("並べ替えに失敗しました");
      fetchData(); // 失敗時はリフェッチ
    }
  };

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            商品管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            商品の追加・編集・削除を管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportButton
            title="商品CSVインポート"
            description="商品本体、バリアント、およびステージ別卸単価を一括で登録・更新します。商品名が一致するデータは更新され、新しい商品名の場合は新規追加されます。"
            onImport={async (data) => {
              const res = await apiPost<{ successCount: number; errorCount: number; errors: string[] }>(
                "/api/admin/imports/products",
                data
              );
              fetchData();
              return {
                success: res.errorCount === 0,
                message: `${res.successCount} 件の商品グループを処理しました${res.errorCount > 0 ? `（${res.errorCount} 件のエラー）` : ""}`,
              };
            }}
          />
          <Link
            href="/admin/products/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              "bg-primary hover:bg-primary/90 btn-lift"
            )}
          >
            <Plus className="w-4 h-4 mr-2" />
            商品を追加
          </Link>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="商品名で検索..."
            className="pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select
          value={selectedCategory}
          onValueChange={(val: string | null) => setSelectedCategory(val || "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 商品一覧 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchText || selectedCategory !== "all"
                ? "条件に一致する商品がありません"
                : "商品がまだ登録されていません"}
            </p>
            {!searchText && selectedCategory === "all" && (
              <Link
                href="/admin/products/new"
                className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
              >
                最初の商品を追加
              </Link>
            )}
          </CardContent>
        </Card>
      ) : groupedProducts ? (
        // カテゴリ別グループ表示
        <div className="space-y-8">
          {groupedProducts.map((group) => (
            <CategoryGroupDnD
              key={group.categoryId}
              categoryName={group.categoryName}
              categoryColor={group.categoryColor}
              products={group.products}
              collapsed={collapsedCategories.has(group.categoryId)}
              onToggle={() => toggleCategory(group.categoryId)}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onReorder={(newProducts) => handleGroupReorder(group.categoryId, newProducts)}
            />
          ))}
        </div>
      ) : (
        // フラット表示（フィルター/検索時）
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{product.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{product.category_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {product.has_variants && (
                        <Badge variant="outline" className="text-xs">バリアントあり</Badge>
                      )}
                      {!product.is_active && (
                        <Badge className="text-xs bg-neutral-400">非公開</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-blue-600"
                    onClick={() => handleCopy(product)}
                    title="商品をコピー"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
