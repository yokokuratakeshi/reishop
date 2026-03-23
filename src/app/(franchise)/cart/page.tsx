"use client";

// 加盟店向けカート画面

import { useState, useEffect } from "react";
import { useCart } from "@/lib/store/useCart";
import { Trash2, Plus, Minus, Package, ArrowRight, ChevronLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatAttributeValues } from "@/lib/utils/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/utils/apiClient";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleCheckout = async () => {
    if (cart.items.length === 0) return;

    setIsSubmitting(true);
    try {
      // 発注APIの呼び出し
      await apiPost("/api/orders", {
        items: cart.items,
        total_amount: cart.totalAmount(),
        item_count: cart.items.length,
        total_quantity: cart.totalQuantity(),
      });

      toast.success("発注が完了しました！");
      cart.clearCart();
      router.push("/orders/success");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "発注に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCartIcon className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-lg font-bold">カートは空です</h2>
        <p className="text-muted-foreground text-sm mt-1">商品を選んでカートに入れてください</p>
        <Link 
          href="/catalog" 
          className={cn(buttonVariants({ variant: "default" }), "mt-6 rounded-full px-8 btn-lift")}
        >
          カタログを見る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 page-enter">
      <div className="flex items-center gap-2">
        <Link href="/catalog" className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">カート内容</h1>
      </div>

      <div className="space-y-3">
        {cart.items.map((item) => (
          <Card key={item.id} className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardContent className="p-4">
              <div className="flex justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.product_name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatAttributeValues(item.attribute_values)}
                  </p>
                  <p className="text-sm font-bold text-primary mt-2">
                    {formatCurrency(item.wholesale_price)}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive -mr-2"
                    onClick={() => cart.removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center bg-muted rounded-full p-0.5 mt-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full hover:bg-background"
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full hover:bg-background"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 合計・決済 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm text-muted-foreground font-medium">合計金額 (税込)</span>
            <span className="text-xl font-black text-foreground">
              {formatCurrency(cart.totalAmount())}
            </span>
          </div>
          
          <Button 
            className="w-full h-12 rounded-2xl text-base font-bold btn-lift" 
            size="lg"
            onClick={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? "処理中..." : "発注を確定する"}
            {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
