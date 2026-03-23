"use client";

// 発注完了画面

import { CheckCircle2, Package, ArrowRight, History } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function OrderSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground">発注を完了しました</h1>
      <p className="text-muted-foreground text-center mt-2 max-w-xs">
        ご注文ありがとうございます。<br />
        内容は「発注履歴」からご確認いただけます。
      </p>

      <div className="flex flex-col gap-3 mt-10 w-full max-w-xs">
        <Link 
          href="/catalog" 
          className={cn(buttonVariants({ variant: "default" }), "h-12 rounded-2xl font-bold btn-lift")}
        >
          カタログに戻る
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
        <Link 
          href="/orders" 
          className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl font-bold")}
        >
          <History className="w-4 h-4 mr-2" />
          発注履歴を見る
        </Link>
      </div>
    </div>
  );
}
