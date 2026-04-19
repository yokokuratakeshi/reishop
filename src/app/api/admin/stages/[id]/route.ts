// ステージ（期）個別操作 API
// PUT: 編集 / DELETE: 無効化（論理削除）

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, CACHE_TAGS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    await adminDb.collection(COLLECTIONS.STAGES).doc(id).update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidateTag(CACHE_TAGS.STAGES, "max");

    return successResponse({ id, ...parsed.data });
  } catch (err) {
    console.error("ステージ更新エラー:", err);
    return errorResponse("INTERNAL_ERROR", "更新に失敗しました", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    // 論理削除（is_active: false）
    await adminDb.collection(COLLECTIONS.STAGES).doc(id).update({
      is_active: false,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidateTag(CACHE_TAGS.STAGES, "max");

    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("ステージ削除エラー:", err);
    return errorResponse("INTERNAL_ERROR", "削除に失敗しました", 500);
  }
}
