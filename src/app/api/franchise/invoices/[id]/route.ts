import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SUBCOLLECTIONS, INVOICE_STATUS } from "@/lib/constants";
import { requireFranchise, successResponse } from "@/lib/utils/api";

/**
 * 加盟店用請求詳細取得 API
 * 自店舗の、発行済み以上の請求書のみ表示可能
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireFranchise(req);
    if (error || !user) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const invoiceDoc = await adminDb.collection(COLLECTIONS.INVOICES).doc(id).get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: "請求書が見つかりませんでした。" }, { status: 404 });
    }

    const invoiceData = invoiceDoc.data();

    // 他店舗の請求書や、下書き状態のものは閲覧不可
    if (invoiceData?.franchise_id !== user.franchiseId) {
      return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });
    }
    if (invoiceData?.status === INVOICE_STATUS.DRAFT) {
      return NextResponse.json({ error: "この請求書はまだ発行されていません。" }, { status: 403 });
    }

    const itemsSnapshot = await invoiceDoc.ref.collection(SUBCOLLECTIONS.ITEMS).orderBy("ordered_at", "asc").get();
    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      ordered_at: doc.data().ordered_at?.toDate?.() || doc.data().ordered_at,
    }));

    return successResponse({
      id: invoiceDoc.id,
      ...(invoiceData as any),
      created_at: (invoiceData as any)?.created_at?.toDate?.() || (invoiceData as any)?.created_at,
      due_date: (invoiceData as any)?.due_date?.toDate?.() || (invoiceData as any)?.due_date,
      issued_at: (invoiceData as any)?.issued_at?.toDate?.() || (invoiceData as any)?.issued_at,
      paid_at: (invoiceData as any)?.paid_at?.toDate?.() || (invoiceData as any)?.paid_at,
      items
    });
  } catch (error) {
    console.error("Fetch franchise invoice detail error:", error);
    return NextResponse.json({ error: "請求詳細の取得に失敗しました。" }, { status: 500 });
  }
}
