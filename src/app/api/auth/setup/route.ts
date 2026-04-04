// セルフ登録 API
// GET: トークン検証 / POST: アカウント作成

import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

export const dynamic = "force-dynamic";

// トークンから招待情報を取得・検証する共通関数
type ValidateError = { error: string; message: string };
type ValidateSuccess = { invDoc: FirebaseFirestore.QueryDocumentSnapshot; invitation: FirebaseFirestore.DocumentData };

async function validateToken(token: string): Promise<ValidateError | ValidateSuccess> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.INVITATIONS)
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { error: "INVALID_TOKEN", message: "無効な招待リンクです" };
  }

  const invDoc = snapshot.docs[0];
  const invitation = invDoc.data();

  if (invitation.used) {
    return { error: "ALREADY_USED", message: "この招待リンクは既に使用されています" };
  }

  const expiresAt = invitation.expires_at?.toDate?.() || new Date(invitation.expires_at);
  if (expiresAt < new Date()) {
    return { error: "EXPIRED", message: "この招待リンクは有効期限が切れています" };
  }

  return { invDoc, invitation };
}

function isValidateError(result: ValidateError | ValidateSuccess): result is ValidateError {
  return isValidateError(result);
}

// GET: トークン検証（公開エンドポイント）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("MISSING_TOKEN", "トークンが必要です", 400);
    }

    const result = await validateToken(token);
    if (isValidateError(result)) {
      return errorResponse(result.error, result.message, 400);
    }

    // 加盟店情報を取得
    const franchiseDoc = await adminDb
      .collection(COLLECTIONS.FRANCHISES)
      .doc(result.invitation.franchise_id)
      .get();

    if (!franchiseDoc.exists) {
      return errorResponse("NOT_FOUND", "加盟店情報が見つかりません", 404);
    }

    const franchise = franchiseDoc.data();

    return successResponse({
      franchise_name: franchise?.name || "",
      franchise_code: franchise?.franchise_code || "",
    });
  } catch (err) {
    console.error("トークン検証エラー:", err);
    return errorResponse("INTERNAL_ERROR", "検証に失敗しました", 500);
  }
}

// POST: アカウント作成（公開エンドポイント）
const setupSchema = z.object({
  token: z.string().min(1),
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "入力内容を確認してください", 422);
    }

    const { token, email, password } = parsed.data;

    // トークン再検証
    const result = await validateToken(token);
    if (isValidateError(result)) {
      return errorResponse(result.error, result.message, 400);
    }

    const { invDoc, invitation } = result;
    const franchiseId = invitation.franchise_id;

    // 加盟店情報を取得
    const franchiseRef = adminDb.collection(COLLECTIONS.FRANCHISES).doc(franchiseId);
    const franchiseDoc = await franchiseRef.get();

    if (!franchiseDoc.exists) {
      return errorResponse("NOT_FOUND", "加盟店情報が見つかりません", 404);
    }

    const franchise = franchiseDoc.data();

    // 既にアカウントがある場合
    if (franchise?.auth_uid) {
      return errorResponse("ALREADY_REGISTERED", "この加盟店は既にアカウントが登録されています", 400);
    }

    // Firebase Auth ユーザー作成
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: franchise?.name || "",
    });

    // カスタムクレーム設定
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: USER_ROLES.FRANCHISE,
      franchise_id: franchiseId,
    });

    const now = FieldValue.serverTimestamp();

    // users コレクションに保存
    await adminDb.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: franchise?.name || "",
      role: USER_ROLES.FRANCHISE,
      franchise_id: franchiseId,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // 加盟店ドキュメントに UID を紐付け
    await franchiseRef.update({
      auth_uid: userRecord.uid,
      email,
      updated_at: now,
    });

    // 招待を使用済みにする
    await invDoc.ref.update({
      used: true,
      used_at: now,
    });

    return successResponse({ uid: userRecord.uid, franchise_id: franchiseId });
  } catch (err: any) {
    console.error("アカウント作成エラー:", err);

    if (err?.code === "auth/email-already-exists") {
      return errorResponse("EMAIL_EXISTS", "このメールアドレスは既に使用されています", 400);
    }

    return errorResponse("INTERNAL_ERROR", "アカウントの作成に失敗しました", 500);
  }
}
