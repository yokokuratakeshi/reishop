"use client";

// 加盟店セルフ登録ページ
// 店名・メール・パスワードを入力して登録し、そのままログイン画面へ誘導する。
// 登録直後は status=pending。本部が承認するまで発注はできない。

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, ArrowLeft, Store } from "lucide-react";
import Link from "next/link";

const registerSchema = z.object({
  name: z.string().min(1, "店名を入力してください"),
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  passwordConfirm: z.string().min(6, "パスワードは6文字以上で入力してください"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "パスワードが一致しません",
  path: ["passwordConfirm"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function FranchiseRegisterPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await fetch("/api/auth/franchise-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message || "登録に失敗しました");
        return;
      }

      setRegisteredEmail(data.email);
      setIsSuccess(true);
      toast.success("加盟店登録が完了しました");
    } catch {
      toast.error("登録に失敗しました。しばらく時間をおいて再試行してください。");
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, #e0e7ff 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #fed7aa 0%, transparent 50%)",
          }}
        />
        <div className="w-full max-w-md relative z-10 text-center space-y-6 page-enter">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">登録が完了しました</h2>
          <div className="text-muted-foreground text-sm space-y-2">
            <p>
              <span className="font-semibold text-foreground">{registeredEmail}</span> でアカウントを作成しました。
            </p>
            <p>
              <span className="font-semibold text-amber-600">現在、本部の承認待ちです。</span><br />
              本部が所属ステージを設定して承認すると、発注が可能になります。
            </p>
            <p className="text-xs mt-4">
              ※ログインは可能ですが、承認までの間はカタログが表示されない場合があります。
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
            >
              ログイン画面へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
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
            <Store className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">加盟店 新規登録</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            店名・メールアドレス・パスワードを入力してください。<br />
            登録後、本部の承認をもって発注が可能になります。
          </p>
        </div>

        {/* 登録カード */}
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              アカウント作成
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              必要事項をご入力ください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* 店名 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  店名
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="例：渋谷店"
                  autoComplete="organization"
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* メール */}
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
                  "登録する"
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
