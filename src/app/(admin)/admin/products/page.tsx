"use client";

// 商品一覧画面（管理画面）

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
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { Product, Category } from "@/types";
import { apiGet, apiDelete } from "@/lib/utils/apiClient";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CsvImportButton } from "@/components/admin/csv-import-button";
import { apiPost } from "@/lib/utils/apiClient";


const PRODUCT_TYPE_LABELS: Record<string, string> = {
  apparel: "アパレル",
  accessory: "アクセサリー",
  non_apparel: "非アパレル",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  // フィルタリング（クライアント側）
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchText === "" ||
      p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* 商品画像 */}
                  <div className="w-16 h-16 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
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
                      <Badge variant="secondary" className="text-xs">
                        {PRODUCT_TYPE_LABELS[product.product_type] ?? product.product_type}
                      </Badge>
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
