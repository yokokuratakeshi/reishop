// 加盟店管理 API
// GET: 一覧取得 / POST: 新規追加

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const franchiseSchema = z.object({
  name: z.string().min(1, "加盟店名は必須です"),
  franchise_code: z.string().min(1, "加盟店コードは必須です"),
  stage_id: z.string().min(1, "ステージは必須です"),
  stage_name: z.string().min(1),
  area: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.FRANCHISES)
      .orderBy("franchise_code", "asc")
      .get();

    const franchises = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return successResponse(franchises);
  } catch (err) {
    console.error("加盟店一覧取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの取得に失敗しました", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = franchiseSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection(COLLECTIONS.FRANCHISES).add({
      ...parsed.data,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    return successResponse({ id: docRef.id, ...parsed.data, is_active: true }, 201);
  } catch (err) {
    console.error("加盟店追加エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの追加に失敗しました", 500);
  }
}
