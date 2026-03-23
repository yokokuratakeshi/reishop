"use client";

// ステージ（期）管理画面
// 一覧表示・追加・編集・削除機能を提供する

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Stage } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/apiClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const stageSchema = z.object({
  name: z.string().min(1, "ステージ名は必須です"),
  sort_order: z.number().int().min(0, "表示順序は0以上の整数"),
});
type StageForm = z.infer<typeof stageSchema>;

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StageForm>({ resolver: zodResolver(stageSchema) });

  const fetchStages = useCallback(async () => {
    try {
      const data = await apiGet<Stage[]>("/api/admin/stages");
      setStages(data);
    } catch {
      toast.error("ステージ情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const openCreateDialog = () => {
    setEditingStage(null);
    reset({ name: "", sort_order: stages.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (stage: Stage) => {
    setEditingStage(stage);
    reset({ name: stage.name, sort_order: stage.sort_order });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StageForm) => {
    try {
      if (editingStage) {
        await apiPut(`/api/admin/stages/${editingStage.id}`, data);
        toast.success("ステージを更新しました");
      } else {
        await apiPost("/api/admin/stages", data);
        toast.success("ステージを追加しました");
      }
      setIsDialogOpen(false);
      fetchStages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作に失敗しました");
    }
  };

  const handleDelete = async (stage: Stage) => {
    if (!confirm(`「${stage.name}」を削除しますか？`)) return;
    try {
      await apiDelete(`/api/admin/stages/${stage.id}`);
      toast.success("ステージを削除しました");
      fetchStages();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ステージ管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            加盟店の料金区分（期）を管理します
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary hover:bg-primary/90 btn-lift"
        >
          <Plus className="w-4 h-4 mr-2" />
          ステージを追加
        </Button>
      </div>

      {/* ステージ一覧 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              ステージがまだ登録されていません
            </p>
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="mt-4"
            >
              最初のステージを追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => (
            <Card key={stage.id} className="border-border shadow-sm">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-semibold text-foreground">
                      {stage.name}
                    </span>
                    <span className="text-muted-foreground text-sm ml-3">
                      表示順: {stage.sort_order}
                    </span>
                  </div>
                  {!stage.is_active && (
                    <Badge variant="secondary">無効</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => openEditDialog(stage)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(stage)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStage ? "ステージを編集" : "ステージを追加"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="stage-name">ステージ名</Label>
              <Input
                id="stage-name"
                placeholder="例: 0期, 0.5期, 1期"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-order">表示順序</Label>
              <Input
                id="sort-order"
                type="number"
                min={0}
                {...register("sort_order", { valueAsNumber: true })}
              />
              {errors.sort_order && (
                <p className="text-destructive text-xs">
                  {errors.sort_order.message}
                </p>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
