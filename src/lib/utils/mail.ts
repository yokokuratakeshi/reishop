// メール送信ユーティリティ
// Resend APIを使用してメールを送信する
// 環境変数 RESEND_API_KEY が未設定の場合はスキップ（ログ出力のみ）

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 送信元メールアドレス（Resendのデフォルトドメインまたはカスタムドメイン）
const FROM_EMAIL = process.env.MAIL_FROM || "発注管理システム <onboarding@resend.dev>";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions): Promise<boolean> {
  if (!resend) {
    console.log("[メール送信スキップ] RESEND_API_KEY が未設定です");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("メール送信エラー:", error);
      return false;
    }

    console.log(`メール送信成功: ${to}`);
    return true;
  } catch (err) {
    console.error("メール送信例外:", err);
    return false;
  }
}

// 加盟店アカウント作成通知メール
export async function sendFranchiseAccountEmail({
  to,
  franchiseName,
  loginUrl,
  passwordResetLink,
}: {
  to: string;
  franchiseName: string;
  loginUrl: string;
  passwordResetLink?: string;
}): Promise<boolean> {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #4F46E5; color: white; font-weight: bold; font-size: 24px; width: 56px; height: 56px; line-height: 56px; border-radius: 16px;">FC</div>
      </div>

      <h1 style="font-size: 22px; font-weight: bold; color: #1a1a1a; margin-bottom: 16px; text-align: center;">
        発注管理システム<br>アカウントのご案内
      </h1>

      <p style="color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        <strong>${franchiseName}</strong> 様<br><br>
        フランチャイズ発注管理システムのアカウントが作成されました。<br>
        以下のリンクからパスワードを設定し、ログインしてください。
      </p>

      ${passwordResetLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${passwordResetLink}"
           style="display: inline-block; background: #4F46E5; color: white; font-weight: bold; font-size: 16px; padding: 14px 40px; border-radius: 12px; text-decoration: none;">
          パスワードを設定する
        </a>
      </div>
      <p style="color: #888; font-size: 13px; text-align: center; margin-bottom: 24px;">
        ※ このリンクは一定時間で無効になります
      </p>
      ` : ""}

      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 14px; color: #555; margin: 0 0 8px 0;">
          <strong>ログインURL:</strong><br>
          <a href="${loginUrl}" style="color: #4F46E5;">${loginUrl}</a>
        </p>
        <p style="font-size: 14px; color: #555; margin: 0;">
          <strong>メールアドレス:</strong> ${to}
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

      <p style="color: #aaa; font-size: 12px; text-align: center;">
        このメールはフランチャイズ発注管理システムから自動送信されています。<br>
        心当たりがない場合はこのメールを無視してください。
      </p>
    </div>
  `;

  return sendMail({
    to,
    subject: `【発注管理システム】アカウントが作成されました - ${franchiseName}`,
    html,
  });
}
