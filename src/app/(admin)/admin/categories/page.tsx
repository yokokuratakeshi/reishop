"use client";

// カテゴリ管理画面
// ステージ管理と同様の構成で実装

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Category } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/apiClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  sort_order: z.number().int().min(0, "表示順序は0以上の整数"),
});
type CategoryForm = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiGet<Category[]>("/api/admin/categories");
      setCategories(data);
    } catch {
      toast.error("カテゴリ情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    reset({ name: "", sort_order: categories.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    reset({ name: category.name, sort_order: category.sort_order });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CategoryForm) => {
    try {
      if (editingCategory) {
        await apiPut(`/api/admin/categories/${editingCategory.id}`, data);
        toast.success("カテゴリを更新しました");
      } else {
        await apiPost("/api/admin/categories", data);
        toast.success("カテゴリを追加しました");
      }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作に失敗しました");
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`「${category.name}」を削除しますか？\n紐付いている商品が表示されなくなります。`)) return;
    try {
      await apiDelete(`/api/admin/categories/${category.id}`);
      toast.success("カテゴリを削除しました");
      fetchCategories();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            カテゴリ管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            商品カテゴリを管理します
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 btn-lift">
          <Plus className="w-4 h-4 mr-2" />
          カテゴリを追加
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">カテゴリがまだ登録されていません</p>
            <Button onClick={openCreateDialog} variant="outline" className="mt-4">
              最初のカテゴリを追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id} className="border-border shadow-sm">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-semibold text-foreground">{category.name}</span>
                    <span className="text-muted-foreground text-sm ml-3">表示順: {category.sort_order}</span>
                  </div>
                  {!category.is_active && <Badge variant="secondary">無効</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(category)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(category)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "カテゴリを編集" : "カテゴリを追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">カテゴリ名</Label>
              <Input id="cat-name" placeholder="例: ウエア, アクセサリー, その他" {...register("name")} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-sort">表示順序</Label>
              <Input id="cat-sort" type="number" min={0} {...register("sort_order", { valueAsNumber: true })} />
              {errors.sort_order && <p className="text-destructive text-xs">{errors.sort_order.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
