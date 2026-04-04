// 招待リンク生成 API
// POST: 加盟店の招待トークンを生成

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { id: franchiseId } = await params;

    // 加盟店の存在確認
    const franchiseDoc = await adminDb
      .collection(COLLECTIONS.FRANCHISES)
      .doc(franchiseId)
      .get();

    if (!franchiseDoc.exists) {
      return errorResponse("NOT_FOUND", "加盟店が見つかりません", 404);
    }

    const franchise = franchiseDoc.data();
    if (!franchise?.is_active) {
      return errorResponse("INACTIVE", "この加盟店は無効です", 400);
    }

    // 既にアカウントがある場合は拒否
    if (franchise.auth_uid) {
      return errorResponse("ALREADY_REGISTERED", "この加盟店は既にアカウントが登録されています", 400);
    }

    // トークン生成
    const token = randomUUID();
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後

    await adminDb.collection(COLLECTIONS.INVITATIONS).add({
      franchise_id: franchiseId,
      token,
      expires_at: expiresAt,
      used: false,
      created_at: now,
    });

    return successResponse({
      token,
      url: `/setup/${token}`,
    });
  } catch (err) {
    console.error("招待リンク生成エラー:", err);
    return errorResponse("INTERNAL_ERROR", "招待リンクの生成に失敗しました", 500);
  }
}
