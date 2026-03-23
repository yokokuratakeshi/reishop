import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/constants";

/**
 * 請求書発行時の通知シミュレーション
 * @param invoiceId 請求書ID
 * @param franchiseId 加盟店ID
 * @param amount 請求金額
 * @param month 請求月 (YYYY-MM)
 */
export async function notifyInvoiceIssued(
  invoiceId: string,
  franchiseId: string,
  amount: number,
  month: string
) {
  try {
    // 加盟店情報を取得してメールアドレスを特定する
    const franchiseDoc = await adminDb.collection(COLLECTIONS.FRANCHISES).doc(franchiseId).get();
    const franchiseData = franchiseDoc.data();
    const email = franchiseData?.email || "不明";
    const name = franchiseData?.name || "加盟店様";

    // 実際にはここで SendGrid などの API を呼び出す
    console.log(`[NOTIFICATION] Sending email to ${email}...`);
    console.log(`
      件名: 【重要】${month}分のご請求書発行のお知らせ
      
      ${name} 様
      
      いつも大変お世話になっております。
      ${month}分のご請求書を発行いたしましたので、お知らせいたします。
      
      ■請求金額: ¥${amount.toLocaleString()}
      ■お支払い期限: 別途請求書に記載
      
      下記URLより詳細をご確認いただけます：
      http://localhost:3000/invoices/${invoiceId}
      
      ご確認のほど、よろしくお願い申し上げます。
    `);

    // 通知履歴をDBに保存することも検討可能
    return true;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return false;
  }
}
