"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { signIn } from "@/lib/firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { user, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // 既ログイン時の自動遷移
  // Firebase Clientは認証済みだがサーバーセッションCookieが切れている場合に
  // proxy.ts との間でリダイレクトループが発生するのを防ぐため、
  // 先にサーバーセッションを再作成してから遷移する。
  useEffect(() => {
    if (isLoading || !user) return;

    (async () => {
      try {
        // 最新ロールを取得
        const tokenResult = await user.getIdTokenResult(true);
        const userRole = tokenResult.claims["role"] as string | undefined;

        // 管理者でない場合はクライアント側もサインアウトしてループを止める
        if (userRole !== "admin") {
          const { logout } = await import("@/lib/firebase/auth");
          await logout();
          toast.error("管理者権限がありません。");
          return;
        }

        // サーバーセッションCookieを再作成
        const idToken = await user.getIdToken(true);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        window.location.assign("/admin/dashboard");
      } catch (err) {
        console.error("セッション復旧エラー:", err);
      }
    })();
  }, [user, isLoading]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const userCredential = await signIn(data.email, data.password);
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const userRole = tokenResult.claims["role"] as string | undefined;

      if (userRole === "admin") {
        // フルページ遷移でセッションCookieの確実な送信とルーターキャッシュ回避
        window.location.assign("/admin/dashboard");
      } else {
        toast.error("管理者権限がありません。");
      }
    } catch (error: any) {
      toast.error("ログインに失敗しました。認証情報を確認してください。");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] relative overflow-hidden px-4">
      {/* プレミアムな背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 mb-6 shadow-2xl shadow-indigo-500/20">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            ADMIN <span className="text-indigo-400">PORTAL</span>
          </h1>
          <p className="text-zinc-400 font-medium">システム管理者専用ログインパネル</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-bold text-white">ログイン</CardTitle>
            <CardDescription className="text-zinc-500">管理者用認証情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-400 font-bold text-xs uppercase tracking-widest pl-1">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      className="bg-zinc-950/50 border-zinc-800 text-white pl-10 h-12 rounded-xl focus-visible:ring-indigo-500 transition-all font-medium"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && <p className="text-rose-500 text-xs font-bold mt-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-400 font-bold text-xs uppercase tracking-widest pl-1">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-zinc-950/50 border-zinc-800 text-white pl-10 h-12 rounded-xl focus-visible:ring-indigo-500 transition-all font-medium"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && <p className="text-rose-500 text-xs font-bold mt-1">{errors.password.message}</p>}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "認証を開始する"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-zinc-600 text-xs mt-8 font-medium">
          &copy; {new Date().getFullYear()} Order Management System. Admin Authorization Required.
        </p>
      </div>
    </div>
  );
}
