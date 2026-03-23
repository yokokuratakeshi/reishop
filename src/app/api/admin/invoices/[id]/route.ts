import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SUBCOLLECTIONS, INVOICE_STATUS } from "@/lib/constants";
import { requireAdmin, successResponse } from "@/lib/utils/api";
import { z } from "zod";
import { notifyInvoiceIssued } from "@/lib/utils/notifications";

const updateSchema = z.object({
  status: z.enum([INVOICE_STATUS.DRAFT, INVOICE_STATUS.ISSUED, INVOICE_STATUS.PAID]),
  due_date: z.string().optional(),
});

/**
 * 請求詳細取得 API
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await params;
    const invoiceDoc = await adminDb.collection(COLLECTIONS.INVOICES).doc(id).get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: "請求書が見つかりませんでした。" }, { status: 404 });
    }

    const invoiceData = invoiceDoc.data();
    const itemsSnapshot = await invoiceDoc.ref.collection(SUBCOLLECTIONS.ITEMS).orderBy("ordered_at", "asc").get();
    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      ordered_at: doc.data().ordered_at?.toDate?.() || doc.data().ordered_at,
    }));

    return successResponse({
      id: invoiceDoc.id,
      ...invoiceData,
      created_at: invoiceData?.created_at?.toDate?.() || invoiceData?.created_at,
      due_date: invoiceData?.due_date?.toDate?.() || invoiceData?.due_date,
      issued_at: invoiceData?.issued_at?.toDate?.() || invoiceData?.issued_at,
      paid_at: invoiceData?.paid_at?.toDate?.() || invoiceData?.paid_at,
      items
    });
  } catch (error) {
    console.error("Fetch invoice detail error:", error);
    return NextResponse.json({ error: "請求詳細の取得に失敗しました。" }, { status: 500 });
  }
}

/**
 * 請求ステータス更新 API
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin(req);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const invoiceRef = adminDb.collection(COLLECTIONS.INVOICES).doc(id);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: "請求書が見つかりませんでした。" }, { status: 404 });
    }

    const updates: any = {
      status: validated.status,
      updated_at: new Date(),
    };

    if (validated.due_date) {
      updates.due_date = new Date(validated.due_date);
    }

    // ステータスに応じた日付設定
    if (validated.status === INVOICE_STATUS.ISSUED && !invoiceDoc.data()?.issued_at) {
      updates.issued_at = new Date();
    } else if (validated.status === INVOICE_STATUS.PAID && !invoiceDoc.data()?.paid_at) {
      updates.paid_at = new Date();
    }

    await invoiceRef.update(updates);

    // 発行済になったら通知を送る（非同期で実行）
    if (validated.status === INVOICE_STATUS.ISSUED) {
      const data = invoiceDoc.data();
      if (data) {
        notifyInvoiceIssued(
          id, 
          data.franchise_id, 
          data.total_amount, 
          data.year_month
        ).catch(err => console.error("Notification trigger error:", err));
      }
    }

    return successResponse({ success: true, message: "ステータスを更新しました。" });
  } catch (error) {
    console.error("Update invoice error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "請求書の更新に失敗しました。" }, { status: 500 });
  }
}
