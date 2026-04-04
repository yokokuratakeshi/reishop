"use client";

// 管理者アカウント登録ページ
// メール・パスワード・表示名を入力してアカウントを作成する

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const registerSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  passwordConfirm: z.string().min(6, "パスワードは6文字以上で入力してください"),
  displayName: z.string().min(1, "表示名を入力してください"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "パスワードが一致しません",
  path: ["passwordConfirm"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AdminRegisterPage() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          displayName: data.displayName,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message || "登録に失敗しました");
        return;
      }

      setIsSuccess(true);
      toast.success("管理者アカウントを作成しました");
    } catch {
      toast.error("登録に失敗しました。しばらく時間をおいて再試行してください。");
    }
  };

  // 登録成功画面
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, #e0e7ff 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #fed7aa 0%, transparent 50%)",
          }}
        />
        <div className="w-full max-w-md relative z-10 text-center space-y-6 page-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">登録完了</h2>
          <p className="text-muted-foreground text-sm">
            管理者アカウントが正常に作成されました。<br />
            登録したメールアドレスとパスワードでログインできます。
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={() => router.push("/login")}
            >
              ログインページへ
            </Button>
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => {
                setIsSuccess(false);
              }}
            >
              続けて登録する
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* 背景のグラデーション装飾 */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, #e0e7ff 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #fed7aa 0%, transparent 50%)",
        }}
      />

      <div className="w-full max-w-md relative z-10 page-enter">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              FC
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            管理者アカウント登録
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            メールアドレスとパスワードを設定してください
          </p>
        </div>

        {/* 登録カード */}
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              アカウント作成
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              管理者用アカウントの情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* 表示名 */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  表示名
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="山田 太郎"
                  autoComplete="name"
                  className={errors.displayName ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("displayName")}
                />
                {errors.displayName && (
                  <p className="text-destructive text-xs mt-1">{errors.displayName.message}</p>
                )}
              </div>

              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  パスワード
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6文字以上"
                  autoComplete="new-password"
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* パスワード確認 */}
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-sm font-medium text-foreground">
                  パスワード（確認）
                </Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="もう一度入力してください"
                  autoComplete="new-password"
                  className={errors.passwordConfirm ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("passwordConfirm")}
                />
                {errors.passwordConfirm && (
                  <p className="text-destructive text-xs mt-1">{errors.passwordConfirm.message}</p>
                )}
              </div>

              {/* 登録ボタン */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-lift"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "アカウントを作成"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
