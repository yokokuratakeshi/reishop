"use client";

// 加盟店管理画面

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Store, Search, Download, Link2, Copy, Check, ShieldCheck } from "lucide-react";
import { CsvImportButton } from "@/components/admin/csv-import-button";
import { Franchise, Stage } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/apiClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const franchiseSchema = z.object({
  franchise_code: z.string().min(1, "加盟店コードは必須です"),
  name: z.string().min(1, "加盟店名は必須です"),
  stage_id: z.string().min(1, "ステージは必須です"),
  area: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").or(z.literal("")),
  password: z.string().min(6, "パスワードは6文字以上必要です").or(z.literal("")),
});
type FranchiseForm = z.infer<typeof franchiseSchema>;

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FranchiseForm>({ 
    resolver: zodResolver(franchiseSchema),
    defaultValues: {
      franchise_code: "",
      name: "",
      stage_id: "",
      area: "",
      email: "",
      password: "",
    }
  });

  const watchedStageId = watch("stage_id");

  const fetchData = useCallback(async () => {
    try {
      const [fData, sData] = await Promise.all([
        apiGet<Franchise[]>("/api/admin/franchises"),
        apiGet<Stage[]>("/api/admin/stages"),
      ]);
      setFranchises(fData);
      setStages(sData.filter((s) => s.is_active));
    } catch {
      toast.error("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingFranchise(null);
    reset({ franchise_code: "", name: "", stage_id: "", area: "", email: "", password: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    reset({
      franchise_code: franchise.franchise_code,
      name: franchise.name,
      stage_id: franchise.stage_id,
      area: franchise.area || "",
      email: franchise.email || "",
      password: "", // 編集時はパスワードは空（変更する場合のみ入力）
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FranchiseForm) => {
    const stage = stages.find((s) => s.id === data.stage_id);
    const isApprovingPending = editingFranchise?.status === "pending";
    const payload: Record<string, unknown> = {
      ...data,
      stage_name: stage?.name || "",
      // 空文字の場合は null として送信
      email: data.email || null,
      password: data.password || null,
    };

    // 承認待ち加盟店を編集保存する場合は approved に昇格させる
    if (isApprovingPending) {
      payload.status = "approved";
    }

    try {
      if (editingFranchise) {
        await apiPut(`/api/admin/franchises/${editingFranchise.id}`, payload);
        toast.success(isApprovingPending ? "加盟店を承認しました" : "加盟店情報を更新しました");
      } else {
        const res = await apiPost<{ warning?: string }>("/api/admin/franchises", payload);
        if (res.warning) {
          toast.warning(res.warning);
        } else if (data.email) {
          toast.success("加盟店を追加しました。アカウント案内メールを送信しました。");
        } else {
          toast.success("加盟店を追加しました");
        }
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作に失敗しました");
    }
  };

  const handleDelete = async (franchise: Franchise) => {
    if (!confirm(`加盟店「${franchise.name}」を無効化しますか？`)) return;
    try {
      await apiDelete(`/api/admin/franchises/${franchise.id}`);
      toast.success("加盟店を無効化しました");
      fetchData();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleAdminRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdminSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("admin-email") as string;
    const password = formData.get("admin-password") as string;
    const displayName = formData.get("admin-name") as string;

    if (!email || !password || !displayName) {
      toast.error("すべての項目を入力してください");
      setIsAdminSubmitting(false);
      return;
    }
    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      setIsAdminSubmitting(false);
      return;
    }

    try {
      await apiPost("/api/auth/register", { email, password, displayName });
      toast.success("管理者アカウントを作成しました");
      setIsAdminDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "管理者の作成に失敗しました");
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const filteredFranchises = franchises.filter(
    (f) =>
      f.name.toLowerCase().includes(searchText.toLowerCase()) ||
      f.franchise_code.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            加盟店管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            加盟店のアカウントとステージ紐付けを管理します
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvImportButton
            title="加盟店CSVインポート"
            description="加盟店情報を一括で登録・更新します。IDが一致するデータは更新され、IDがないデータは新規登録されます。"
            onImport={async (data) => {
              const res = await apiPost<{ successCount: number; errorCount: number; errors: string[] }>(
                "/api/admin/imports/franchises",
                data
              );
              fetchData();
              return {
                success: res.errorCount === 0,
                message: `${res.successCount} 件の加盟店をインポートしました${res.errorCount > 0 ? `（${res.errorCount} 件のエラー）` : ""}`,
              };
            }}
          />
          <Button variant="outline" onClick={() => setIsAdminDialogOpen(true)}>
            <ShieldCheck className="w-4 h-4 mr-2" />
            管理者を追加
          </Button>
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 btn-lift">
            <Plus className="w-4 h-4 mr-2" />
            加盟店を追加
          </Button>
        </div>
      </div>

      {/* 検索 */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="店名・店舗コードで検索..."
          className="pl-9"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filteredFranchises.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">加盟店が見つかりません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFranchises.map((f: any) => (
            <Card key={f.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <Store className="w-5 h-5 text-primary" />
                    {f.auth_uid && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center shadow-sm" title="アカウント作成済み">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{f.name}</span>
                      <span className="text-muted-foreground text-xs">({f.franchise_code})</span>
                      {f.status === "pending" && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] h-5">
                          承認待ち
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {f.stage_name ? (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {f.stage_name}
                        </Badge>
                      ) : (
                        <span className="text-amber-600 text-[10px]">ステージ未設定</span>
                      )}
                      {f.area && <span className="text-muted-foreground text-[10px]">{f.area}</span>}
                      {f.email && <span className="text-muted-foreground text-[10px] ml-1">{f.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  {f.status === "pending" ? (
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => openEditDialog(f)}
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      承認する
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(f)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(f)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 加盟店追加・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFranchise ? "加盟店を編集" : "加盟店を追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") e.preventDefault(); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-code">店舗コード *</Label>
                <Input id="f-code" placeholder="例: FC001" {...register("franchise_code")} />
                {errors.franchise_code && <p className="text-destructive text-xs">{errors.franchise_code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-name">加盟店名 *</Label>
                <Input id="f-name" placeholder="例: 東京青山店" {...register("name")} />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ステージ *</Label>
                <Select
                  value={watchedStageId}
                  onValueChange={(v: string | null) => v && setValue("stage_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.stage_id && <p className="text-destructive text-xs">{errors.stage_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-area">エリア</Label>
                <Input id="f-area" placeholder="例: 関東" {...register("area")} />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                ログインアカウント設定
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="f-email">メールアドレス</Label>
                <Input id="f-email" type="email" placeholder="login@example.com" {...register("email")} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-password">
                  {editingFranchise ? "パスワード (変更する場合のみ)" : "パスワード *"}
                </Label>
                <Input id="f-password" type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
              </div>
              
              {!editingFranchise && (
                <p className="text-[10px] text-muted-foreground">
                  ※ メールアドレスとパスワードを入力すると、自動的にログインアカウントが作成されます。
                </p>
              )}
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

      {/* 管理者追加ダイアログ */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              管理者アカウントを追加
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdminRegister} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-name">表示名 *</Label>
              <Input id="admin-name" name="admin-name" placeholder="例: 山田 太郎" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">メールアドレス *</Label>
              <Input id="admin-email" name="admin-email" type="email" placeholder="admin@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">パスワード *</Label>
              <Input id="admin-password" name="admin-password" type="password" placeholder="6文字以上" required minLength={6} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={isAdminSubmitting} className="bg-primary hover:bg-primary/90">
                {isAdminSubmitting ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
