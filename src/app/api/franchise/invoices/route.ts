import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, INVOICE_STATUS } from "@/lib/constants";
import { requireFranchise, successResponse } from "@/lib/utils/api";

/**
 * 加盟店用請求一覧取得 API
 * ログイン中の加盟店の、発行済み以上の請求書のみ表示可能
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireFranchise(req);
    if (error || !user) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("yearMonth");

    // 加盟店IDでフィルタリング、かつ下書き(draft)以外のみ表示
    let query = adminDb.collection(COLLECTIONS.INVOICES)
      .where("franchise_id", "==", user.franchiseId)
      .where("status", "in", [INVOICE_STATUS.ISSUED, INVOICE_STATUS.PAID]);

    if (yearMonth) {
      query = query.where("year_month", "==", yearMonth);
    }

    const snapshot = await query.get();
    const invoices = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() as any),
      created_at: doc.data().created_at?.toDate?.() || doc.data().created_at,
      due_date: doc.data().due_date?.toDate?.() || doc.data().due_date,
      issued_at: doc.data().issued_at?.toDate?.() || doc.data().issued_at,
      paid_at: doc.data().paid_at?.toDate?.() || doc.data().paid_at,
    }));

    // 複合インデックスエラーを避けるため、オンメモリでソート
    invoices.sort((a: any, b: any) => {
      const dateA = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at).getTime();
      const dateB = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return successResponse(invoices);
  } catch (error) {
    console.error("Fetch franchise invoices error:", error);
    return NextResponse.json({ error: "請求一覧の取得に失敗しました。" }, { status: 500 });
  }
}
