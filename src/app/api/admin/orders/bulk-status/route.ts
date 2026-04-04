// 受注ステータス一括更新 API (Admin)
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { z } from "zod";

const VALID_ORDER_STATUSES = ["pending", "processing", "shipped", "completed", "cancelled"] as const;

const bulkStatusSchema = z.object({
  orderIds: z.array(z.string()).min(1, "更新対象が選択されていません"),
  status: z.enum(VALID_ORDER_STATUSES, { message: "無効なステータスです" }),
});

export async function POST(request: NextRequest) {
  // 管理者権限チェック
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkStatusSchema.safeParse(body);
    
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const { orderIds, status } = parsed.data;
    const batch = adminDb.batch();
    const now = new Date();

    orderIds.forEach((id) => {
      const ref = adminDb.collection(COLLECTIONS.ORDERS).doc(id);
      batch.update(ref, {
        status: status,
        updated_at: now,
      });
    });

    await batch.commit();

    return successResponse({ 
      updatedCount: orderIds.length,
      status: status 
    });
  } catch (err: any) {
    console.error("Bulk status update error:", err);
    return errorResponse("INTERNAL_ERROR", `一括更新に失敗しました: ${err.message}`, 500);
  }
}
