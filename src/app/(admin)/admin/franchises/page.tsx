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
import { Plus, Pencil, Trash2, Store, Search, Download, Link2, Copy, Check } from "lucide-react";
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

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
    const payload = { 
      ...data, 
      stage_name: stage?.name || "",
      // 空文字の場合は null として送信
      email: data.email || null,
      password: data.password || null,
    };

    try {
      if (editingFranchise) {
        await apiPut(`/api/admin/franchises/${editingFranchise.id}`, payload);
        toast.success("加盟店情報を更新しました");
      } else {
        const res = await apiPost<any>("/api/admin/franchises", payload);
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

  const handleGenerateInvite = async (franchise: Franchise) => {
    setIsGeneratingInvite(true);
    try {
      const res = await apiPost<{ token: string; url: string }>(
        `/api/admin/franchises/${franchise.id}/invite`,
        {}
      );
      const fullUrl = `${window.location.origin}${res.url}`;
      setInviteUrl(fullUrl);
      setInviteCopied(false);
      setInviteDialogOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "招待リンクの生成に失敗しました");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteUrl = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    toast.success("招待リンクをコピーしました");
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const filteredFranchises = franchises.filter(
    (f) =>
      f.name.toLowerCase().includes(searchText.toLowerCase()) ||
      f.franchise_code.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            加盟店管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            加盟店のアカウントとステージ紐付けを管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
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
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {f.stage_name}
                      </Badge>
                      {f.area && <span className="text-muted-foreground text-[10px]">{f.area}</span>}
                      {f.email && <span className="text-muted-foreground text-[10px] ml-1">{f.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!f.auth_uid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => handleGenerateInvite(f)}
                      disabled={isGeneratingInvite}
                      title="招待リンクを発行"
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(f)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(f)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 招待リンクダイアログ */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>招待リンクを発行しました</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              以下のリンクを加盟店に共有してください。リンクは7日間有効です。
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyInviteUrl}
                className="shrink-0"
              >
                {inviteCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFranchise ? "加盟店を編集" : "加盟店を追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") e.preventDefault(); }}>
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
