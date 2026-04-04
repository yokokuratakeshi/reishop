"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Layers,
  Store,
  ClipboardList,
  Receipt,
  UserPlus,
  Package,
  BookOpen,
} from "lucide-react";
import { manualCategories } from "@/lib/manual-data";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Layers,
  Store,
  ClipboardList,
  Receipt,
  UserPlus,
  Package,
};

interface ManualListProps {
  basePath: string;
}

export function ManualList({ basePath }: ManualListProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto page-enter">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-primary" />
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            操作マニュアル
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          FC発注管理システムの使い方を機能ごとに解説しています
        </p>
      </div>

      <div className="space-y-10">
        {manualCategories.map((category) => (
          <div key={category.role}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {category.label}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {category.articles.length}件
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {category.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.articles.map((article) => {
                const Icon = iconMap[article.icon] || BookOpen;
                return (
                  <Link key={article.slug} href={`${basePath}/${article.slug}`}>
                    <Card className="border-border shadow-sm hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
                      <CardContent className="p-5 flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {article.title}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {article.description}
                          </p>
                          <p className="text-primary text-xs mt-2 font-medium">
                            {article.sections.reduce((acc, s) => acc + s.steps.length, 0)}ステップ
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
