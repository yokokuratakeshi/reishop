// カテゴリ並べ替え API
// PATCH: sort_order を一括更新

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, CACHE_TAGS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";

const reorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sort_order: z.number().int().min(0),
  })
);

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "不正なデータです", 422);
    }

    const items = parsed.data;
    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();

    items.forEach((item) => {
      const ref = adminDb.collection(COLLECTIONS.CATEGORIES).doc(item.id);
      batch.update(ref, { sort_order: item.sort_order, updated_at: now });
    });

    await batch.commit();
    revalidateTag(CACHE_TAGS.CATEGORIES, "max");

    return successResponse({ updated: items.length });
  } catch (err) {
    console.error("カテゴリ並べ替えエラー:", err);
    return errorResponse("INTERNAL_ERROR", "並べ替えに失敗しました", 500);
  }
}
