// 加盟店個別操作 API
// PUT: 編集 / DELETE: 論理削除

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const updateFranchiseSchema = z.object({
  name: z.string().min(1).optional(),
  franchise_code: z.string().min(1).optional(),
  stage_id: z.string().min(1).optional(),
  stage_name: z.string().min(1).optional(),
  area: z.string().optional().nullable(),
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
    const parsed = updateFranchiseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    await adminDb.collection(COLLECTIONS.FRANCHISES).doc(id).update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    return successResponse({ id, ...parsed.data });
  } catch (err) {
    console.error("加盟店更新エラー:", err);
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
    await adminDb.collection(COLLECTIONS.FRANCHISES).doc(id).update({
      is_active: false,
      updated_at: FieldValue.serverTimestamp(),
    });
    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("加盟店削除エラー:", err);
    return errorResponse("INTERNAL_ERROR", "削除に失敗しました", 500);
  }
}
