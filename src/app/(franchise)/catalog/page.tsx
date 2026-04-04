"use client";

// 加盟店向け商品カタログ画面

import { useState, useEffect } from "react";
import { Package, Search, Filter, Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Product, ProductVariant } from "@/types";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency, formatAttributeValues } from "@/lib/utils/format";
import { useCart } from "@/lib/store/useCart";
import Image from "next/image";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  
  const cart = useCart();

  const fetchData = async () => {
    try {
      const data = await apiGet<Product[]>("/api/products/catalog");
      setProducts(data);
      
      // カテゴリ抽出
      const cats = Array.from(new Set(data.map(p => p.category_id)))
        .map(id => ({
          id,
          name: data.find(p => p.category_id === id)?.category_name || "その他"
        }));
      setCategories(cats);
    } catch {
      toast.error("カタログの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">商品カタログ</h1>
        
        {/* 検索・フィルタ */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="商品を探す..." 
              className="pl-9 h-10 rounded-xl" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={(v) => v && setSelectedCategory(v)}>
            <SelectTrigger className="w-28 h-10 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="全件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全件</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">該当する商品が見つかりません</p>
        </div>
      ) : selectedCategory === "all" && !searchText ? (
        // カテゴリ別グループ表示
        <div className="space-y-8">
          {categories.map(cat => {
            const catProducts = filteredProducts.filter(p => p.category_id === cat.id);
            if (catProducts.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-foreground">{cat.name}</h2>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{catProducts.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {catProducts.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={(item) => {
                      cart.addItem(item);
                      toast.success("カートに追加しました");
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // フラット表示（フィルター/検索時）
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={(item) => {
              cart.addItem(item);
              toast.success("カートに追加しました");
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// バリアントから属性名一覧と各属性の選択肢を抽出する
function extractAttributes(variants: ProductVariant[]): { name: string; options: string[] }[] {
  if (!variants || variants.length === 0) return [];

  // 全バリアントから属性名を取得（順序を保持するため最初のバリアントのキー順を使う）
  const firstVariant = variants[0];
  const attrNames = Object.keys(firstVariant.attribute_values || {});

  return attrNames.map((name) => {
    // この属性の全選択肢（重複排除・順序保持）
    const optionSet = new Set<string>();
    variants.forEach((v) => {
      const val = v.attribute_values?.[name];
      if (val) optionSet.add(val);
    });
    return { name, options: Array.from(optionSet) };
  });
}

// 属性選択から一致するバリアントを検索
function findMatchingVariant(
  variants: ProductVariant[],
  selections: Record<string, string>
): ProductVariant | undefined {
  return variants.find((v) =>
    Object.entries(selections).every(
      ([key, val]) => v.attribute_values?.[key] === val
    )
  );
}

function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: (item: any) => void }) {
  const variants = product.variants || [];
  const attributes = extractAttributes(variants);
  const hasMultipleVariants = variants.length > 1 && attributes.length > 0;

  // 属性ごとの選択状態（初期値は各属性の最初のオプション）
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    attributes.forEach((attr) => {
      if (attr.options.length > 0) initial[attr.name] = attr.options[0];
    });
    return initial;
  });

  // 選択に一致するバリアントを取得
  const selectedVariant = hasMultipleVariants
    ? findMatchingVariant(variants, selections)
    : variants[0];

  const [quantity, setQuantity] = useState(1);

  const handleSelectAttribute = (attrName: string, value: string) => {
    setSelections((prev) => ({ ...prev, [attrName]: value }));
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-shadow rounded-2xl">
      <div className="flex">
        {/* 画像領域 */}
        <div className="w-28 min-h-28 relative bg-muted shrink-0">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* コンテンツ領域 */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">{product.category_name}</p>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{product.name}</h3>
              </div>
            </div>

            {/* 属性ごとの選択UI */}
            {hasMultipleVariants ? (
              <div className="mt-2 space-y-1.5">
                {attributes.map((attr) => (
                  <div key={attr.name}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{attr.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {attr.options.map((option) => {
                        const isSelected = selections[attr.name] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => handleSelectAttribute(attr.name, option)}
                            className={`px-2 py-0.5 rounded-md text-xs border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "bg-background text-foreground border-border hover:border-primary/50"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  {selectedVariant ? formatAttributeValues(selectedVariant.attribute_values) : "規格なし"}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-xs text-muted-foreground scale-90 origin-left">卸価格</p>
              <p className="text-base font-bold text-primary">
                {selectedVariant && "wholesale_price" in selectedVariant ? formatCurrency((selectedVariant as any).wholesale_price) : "---"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* 数量調整 */}
              <div className="flex items-center border border-border rounded-full h-8">
                <button
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-xs font-bold tabular-nums">{quantity}</span>
                <button
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <Button
                size="sm"
                className="h-8 rounded-full px-4 text-xs font-bold btn-lift"
                disabled={!selectedVariant}
                onClick={() => {
                  if (selectedVariant) {
                    onAddToCart({
                      product_id: product.id,
                      product_name: product.name,
                      variant_id: selectedVariant.id,
                      sku_code: selectedVariant.sku_code,
                      attribute_values: selectedVariant.attribute_values,
                      wholesale_price: (selectedVariant as any).wholesale_price || 0,
                      quantity,
                    });
                    setQuantity(1);
                  }
                }}
              >
                追加
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
