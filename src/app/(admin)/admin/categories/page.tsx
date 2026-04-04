"use client";

// カテゴリ管理画面
// ドラッグ&ドロップで並べ替え可能

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
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "@/lib/utils/apiClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  color: z.string().optional(),
  sort_order: z.number().int().min(0, "表示順序は0以上の整数"),
});
type CategoryForm = z.infer<typeof categorySchema>;

// カテゴリカラーパレット
const CATEGORY_COLORS = [
  { value: "#3B82F6", label: "ブルー" },
  { value: "#10B981", label: "グリーン" },
  { value: "#F59E0B", label: "イエロー" },
  { value: "#EF4444", label: "レッド" },
  { value: "#8B5CF6", label: "パープル" },
  { value: "#EC4899", label: "ピンク" },
  { value: "#F97316", label: "オレンジ" },
  { value: "#06B6D4", label: "シアン" },
  { value: "#84CC16", label: "ライム" },
  { value: "#6366F1", label: "インディゴ" },
  { value: "#14B8A6", label: "ティール" },
  { value: "#A855F7", label: "バイオレット" },
];

// ソート可能なカテゴリアイテム
function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-border shadow-sm">
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {category.color && (
            <span
              className="w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: category.color }}
            />
          )}
          <div>
            <span className="font-semibold text-foreground">{category.name}</span>
          </div>
          {!category.is_active && <Badge variant="secondary">無効</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onEdit(category)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(category)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const watchedColor = watch("color");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // sort_order を更新
    const reorderData = newCategories.map((c, i) => ({ id: c.id, sort_order: i }));
    try {
      await apiPatch("/api/admin/categories/reorder", reorderData);
      toast.success("並び順を更新しました");
    } catch {
      // 失敗時は元に戻す
      setCategories(categories);
      toast.error("並べ替えに失敗しました");
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    reset({ name: "", color: "", sort_order: categories.length });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    reset({ name: category.name, color: category.color || "", sort_order: category.sort_order });
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
            ドラッグで並べ替えできます
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {categories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "カテゴリを編集" : "カテゴリを追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") e.preventDefault(); }}>
            <div className="space-y-2">
              <Label htmlFor="cat-name">カテゴリ名</Label>
              <Input id="cat-name" placeholder="例: ウエア, アクセサリー, その他" {...register("name")} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>カテゴリカラー</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setValue("color", watchedColor === c.value ? "" : c.value)}
                    className="w-8 h-8 rounded-full transition-all ring-offset-2 ring-offset-background"
                    style={{
                      backgroundColor: c.value,
                      boxShadow: watchedColor === c.value ? `0 0 0 2px ${c.value}` : "none",
                      transform: watchedColor === c.value ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    {watchedColor === c.value && (
                      <span className="flex items-center justify-center text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
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
