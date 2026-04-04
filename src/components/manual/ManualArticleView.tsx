"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Lightbulb, CheckCircle } from "lucide-react";
import { getManualArticle } from "@/lib/manual-data";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface ManualArticleViewProps {
  basePath: string;
}

export function ManualArticleView({ basePath }: ManualArticleViewProps) {
  const params = useParams();
  const slug = params.slug as string;
  const article = getManualArticle(slug);

  if (!article) {
    return (
      <div className="p-6 max-w-3xl mx-auto page-enter">
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">マニュアルが見つかりません</p>
          <Link
            href={basePath}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            マニュアル一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      {/* パンくず */}
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        マニュアル一覧
      </Link>

      {/* タイトル */}
      <div className="mb-8">
        <Badge variant="secondary" className="text-xs mb-3">
          {article.role === "admin" ? "管理者向け" : "加盟店向け"}
        </Badge>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {article.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {article.description}
        </p>
      </div>

      {/* セクション */}
      <div className="space-y-10">
        {article.sections.map((section, sIdx) => (
          <div key={sIdx}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                {sIdx + 1}
              </div>
              {section.heading}
            </h2>

            <div className="space-y-4 ml-3">
              {section.steps.map((step, stepIdx) => (
                <Card key={stepIdx} className="border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                          {stepIdx + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                          {step.description}
                        </p>
                        {step.tips && (
                          <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              {step.tips}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-10 pt-6 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">このマニュアルは以上です</span>
        </div>
        <Link
          href={basePath}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
        >
          マニュアル一覧に戻る
        </Link>
      </div>
    </div>
  );
}
