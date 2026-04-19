"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { signIn, signInWithGoogle } from "@/lib/firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // ログイン済みの場合はロールに応じてリダイレクト
  // Firebase Client は認証済みだがサーバーセッション Cookie が切れている場合、
  // proxy.ts との間でリダイレクトループが発生するため、遷移前にサーバーセッションを再作成する。
  useEffect(() => {
    if (isLoading || !user) return;

    (async () => {
      try {
        // 最新ロールを取得
        const tokenResult = await user.getIdTokenResult(true);
        const userRole = tokenResult.claims["role"] as string | undefined;

        // ロール未設定の場合はクライアント側もサインアウトしてループを止める
        if (userRole !== "admin" && userRole !== "franchise") {
          const { logout } = await import("@/lib/firebase/auth");
          await logout();
          toast.error("このアカウントにはアクセス権限がありません。管理者にお問い合わせください。");
          return;
        }

        // サーバーセッション Cookie を再作成
        const idToken = await user.getIdToken(true);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (userRole === "admin") {
          window.location.assign("/admin/dashboard");
        } else {
          window.location.assign("/catalog");
        }
      } catch (err) {
        console.error("セッション復旧エラー:", err);
      }
    })();
  }, [user, isLoading]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const userCredential = await signIn(data.email, data.password);
      // カスタムクレームを強制リフレッシュしてロールを取得
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = tokenResult.claims["role"] as string | undefined;

      // フルページ遷移でセッションCookieの確実な送信とルーターキャッシュ回避
      if (userRole === "admin") {
        window.location.assign("/admin/dashboard");
      } else if (userRole === "franchise") {
        window.location.assign("/catalog");
      } else {
        toast.error("このアカウントにはアクセス権限がありません。管理者にお問い合わせください。");
      }
    } catch (error: unknown) {
      // Firebase Authのエラーコードに応じたメッセージを表示
      const errorCode = (error as { code?: string }).code;
      if (
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        toast.error("メールアドレスまたはパスワードが正しくありません");
      } else {
        toast.error("ログインに失敗しました。しばらく時間をおいて再試行してください。");
      }
    }
  };

  const onGoogleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle();
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = tokenResult.claims["role"] as string | undefined;

      if (userRole === "admin") {
        window.location.assign("/admin/dashboard");
      } else if (userRole === "franchise") {
        window.location.assign("/catalog");
      } else {
        toast.error("このアカウントにはアクセス権限がありません。管理者にお問い合わせください。");
      }
    } catch (error: unknown) {
      toast.error("Google ログインに失敗しました。");
      console.error(error);
    }
  };

  // 認証状態を確認中はスケルトンを表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            加盟店発注システム
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            加盟店様専用の注文・管理ポータルです。<br />
            本部の方は管理者画面よりログインしてください。
          </p>
        </div>

        {/* ログインカード */}
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              ログイン
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              メールアドレスとパスワードを入力してください
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
                  placeholder="example@reifc.jp"
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* ログインボタン */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-lift"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </Button>

              {/* 区切り線 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    または
                  </span>
                </div>
              </div>

              {/* Google ログインボタン */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-border hover:bg-muted font-medium flex items-center justify-center gap-2"
                onClick={onGoogleLogin}
                disabled={isSubmitting}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google でログイン
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ログイン情報は本部スタッフよりご案内いたします
        </p>
      </div>
    </div>
  );
}
