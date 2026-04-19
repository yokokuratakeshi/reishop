// ステージ（期）管理 API
// GET: 一覧取得 / POST: 新規追加
//
// パフォーマンス: unstable_cache で 5 分キャッシュし、更新時に revalidateTag で無効化

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { unstable_cache, revalidateTag } from "next/cache";

import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, CACHE_TAGS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const stageSchema = z.object({
  name: z.string().min(1, "ステージ名は必須です"),
  sort_order: z.number().int().min(0),
});

const getStagesCached = unstable_cache(
  async () => {
    const snapshot = await adminDb
      .collection(COLLECTIONS.STAGES)
      .orderBy("sort_order", "asc")
      .get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; is_active?: boolean; [key: string]: unknown }))
      .filter((s) => s.is_active !== false);
  },
  ["stages-all"],
  { revalidate: 300, tags: [CACHE_TAGS.STAGES] }
);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const stages = await getStagesCached();
    return successResponse(stages);
  } catch (err) {
    console.error("ステージ一覧取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの取得に失敗しました", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = stageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection(COLLECTIONS.STAGES).add({
      ...parsed.data,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    revalidateTag(CACHE_TAGS.STAGES, "max");

    return successResponse({ id: docRef.id, ...parsed.data, is_active: true }, 201);
  } catch (err) {
    console.error("ステージ追加エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの追加に失敗しました", 500);
  }
}
