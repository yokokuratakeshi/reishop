"use client";

// 加盟店向け商品カタログ画面

import { useState, useEffect } from "react";
import { Package, Search, Filter } from "lucide-react";
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
      ) : (
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

function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: (item: any) => void }) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants?.[0]?.id || "");
  const selectedVariant = product.variants?.find((v: ProductVariant) => v.id === selectedVariantId);

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-shadow rounded-2xl">
      <div className="flex">
        {/* 画像領域 */}
        <div className="w-28 h-28 relative bg-muted shrink-0">
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
              <Badge variant="outline" className="text-[9px] px-1 h-4 font-normal">
                {product.product_type === "apparel" ? "アパレル" : "備品"}
              </Badge>
            </div>
            
            {/* バリアント選択または単一表示 */}
            <div className="mt-2">
              {product.variants && product.variants.length > 1 ? (
                <Select value={selectedVariantId} onValueChange={(v) => v && setSelectedVariantId(v)}>
                  <SelectTrigger className="h-7 text-xs py-0 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {formatAttributeValues(v.attribute_values)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {selectedVariant ? formatAttributeValues(selectedVariant.attribute_values) : "規格なし"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between mt-1">
            <div>
              <p className="text-xs text-muted-foreground scale-90 origin-left">卸価格</p>
              <p className="text-base font-bold text-primary">
                {selectedVariant && "wholesale_price" in selectedVariant ? formatCurrency((selectedVariant as any).wholesale_price) : "---"}
              </p>
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
                    quantity: 1
                  });
                }
              }}
            >
              カート追加
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
