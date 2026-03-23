import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/constants";
import { requireAdmin, successResponse } from "@/lib/utils/api";

/**
 * 請求一覧取得 API
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("yearMonth");
    const status = searchParams.get("status");
    const franchiseId = searchParams.get("franchiseId");

    let query: any = adminDb.collection(COLLECTIONS.INVOICES);

    if (yearMonth) {
      query = query.where("year_month", "==", yearMonth);
    }
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }
    if (franchiseId && franchiseId !== "all") {
      query = query.where("franchise_id", "==", franchiseId);
    }

    const snapshot = await query.get();
    const invoices = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
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
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: "請求一覧の取得に失敗しました。" }, { status: 500 });
  }
}
