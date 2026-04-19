// バリアント並べ替え API
// PATCH: variants サブコレクションの sort_order を一括更新

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sort_order: z.number().int().min(0),
  })
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { id: productId } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "不正なデータです", 422);
    }

    const items = parsed.data;
    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();
    const variantsCol = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS);

    items.forEach((item) => {
      const ref = variantsCol.doc(item.id);
      batch.update(ref, { sort_order: item.sort_order, updated_at: now });
    });

    await batch.commit();

    return successResponse({ updated: items.length });
  } catch (err) {
    console.error("バリアント並べ替えエラー:", err);
    return errorResponse("INTERNAL_ERROR", "並べ替えに失敗しました", 500);
  }
}
