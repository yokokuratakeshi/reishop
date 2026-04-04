// 管理者アカウント登録API
// POST: メール・パスワードでFirebase Authユーザーを作成し、adminロールを付与する

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    // バリデーション
    if (!email || !password) {
      return errorResponse("INVALID_INPUT", "メールアドレスとパスワードは必須です", 400);
    }

    if (password.length < 6) {
      return errorResponse("INVALID_INPUT", "パスワードは6文字以上で入力してください", 400);
    }

    // Firebase Authにユーザーを作成
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || "管理者",
    });

    // カスタムクレームを設定（adminロール）
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: USER_ROLES.ADMIN,
      franchise_id: null,
    });

    // Firestoreにユーザードキュメントを作成
    await adminDb.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      display_name: displayName || "管理者",
      role: USER_ROLES.ADMIN,
      franchise_id: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return successResponse({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    }, 201);
  } catch (err: unknown) {
    const errorCode = (err as { code?: string }).code;

    if (errorCode === "auth/email-already-exists") {
      return errorResponse("EMAIL_EXISTS", "このメールアドレスは既に登録されています", 409);
    }
    if (errorCode === "auth/invalid-email") {
      return errorResponse("INVALID_EMAIL", "メールアドレスの形式が正しくありません", 400);
    }

    console.error("管理者登録エラー:", err);
    return errorResponse("INTERNAL_ERROR", "アカウントの作成に失敗しました", 500);
  }
}
