"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "@/lib/firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const setupSchema = z
  .object({
    email: z.string().email("正しいメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    confirmPassword: z.string().min(1, "パスワード確認は必須です"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

type PageStatus = "loading" | "valid" | "invalid" | "completed";

export default function SetupPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [franchiseName, setFranchiseName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
  });

  // トークン検証
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/auth/setup?token=${token}`);
        const json = await res.json();

        if (!res.ok) {
          setStatus("invalid");
          setErrorMessage(json.error?.message || "無効な招待リンクです");
          return;
        }

        setFranchiseName(json.data.franchise_name);
        setStatus("valid");
      } catch {
        setStatus("invalid");
        setErrorMessage("招待リンクの検証に失敗しました");
      }
    }
    validate();
  }, [token]);

  const onSubmit = async (data: SetupFormValues) => {
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message || "アカウント作成に失敗しました");
        return;
      }

      // アカウント作成成功 → 自動ログイン
      await signIn(data.email, data.password);
      setStatus("completed");
      toast.success("アカウントが作成されました");

      // カタログページへリダイレクト（フルページ遷移でセッションCookieを確実に送信）
      setTimeout(() => {
        window.location.href = "/catalog";
      }, 1500);
    } catch {
      toast.error("アカウント作成に失敗しました。もう一度お試しください。");
    }
  };

  // ローディング中
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 無効なトークン
  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">招待リンクが無効です</h2>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <Button variant="outline" onClick={() => router.replace("/login")}>
            ログインページへ
          </Button>
        </div>
      </div>
    );
  }

  // 登録完了
  if (status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">アカウント作成完了</h2>
          <p className="text-muted-foreground text-sm">カタログページへ移動しています...</p>
        </div>
      </div>
    );
  }

  // 登録フォーム
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, #e0e7ff 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #fed7aa 0%, transparent 50%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
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
            発注管理システム
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            アカウント設定
          </p>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              アカウント作成
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              <span className="font-semibold text-foreground">{franchiseName}</span> のログインアカウントを設定してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
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
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  パスワード（確認）
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="もう一度入力"
                  autoComplete="new-password"
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "アカウントを作成"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
