// カテゴリ管理 API
// GET: 一覧取得 / POST: 新規追加
//
// パフォーマンス: Firestore 結果を unstable_cache でサーバー側に 5 分キャッシュし、
// POST / PUT / PATCH / DELETE 実行時に revalidateTag("categories") で即無効化する。

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { unstable_cache, revalidateTag } from "next/cache";

import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, CACHE_TAGS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  color: z.string().optional(),
  sort_order: z.number().int().min(0),
});

// カテゴリ一覧を Firestore から取得するキャッシュ関数
const getCategoriesCached = unstable_cache(
  async () => {
    const snapshot = await adminDb
      .collection(COLLECTIONS.CATEGORIES)
      .orderBy("sort_order", "asc")
      .get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; is_active?: boolean; [key: string]: unknown }))
      .filter((c) => c.is_active !== false);
  },
  ["categories-all"],
  { revalidate: 300, tags: [CACHE_TAGS.CATEGORIES] }
);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const categories = await getCategoriesCached();
    return successResponse(categories);
  } catch (err) {
    console.error("カテゴリ一覧取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの取得に失敗しました", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection(COLLECTIONS.CATEGORIES).add({
      ...parsed.data,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // キャッシュを無効化
    revalidateTag(CACHE_TAGS.CATEGORIES, "max");

    return successResponse({ id: docRef.id, ...parsed.data, is_active: true }, 201);
  } catch (err) {
    console.error("カテゴリ追加エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの追加に失敗しました", 500);
  }
}
