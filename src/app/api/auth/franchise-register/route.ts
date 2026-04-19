// 加盟店セルフ登録 API
// 認証不要：加盟店が自分で店名・メール・パスワードを入力して登録する。
// status: "pending" で作成し、本部管理者がステージ割当＋承認するまでは発注不可。

import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const selfRegisterSchema = z.object({
  name: z.string().min(1, "店名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上必要です"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = selfRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "入力内容を確認してください", 422);
    }

    const { name, email, password } = parsed.data;
    const now = FieldValue.serverTimestamp();

    // 1. Firebase Auth にユーザー作成（メール重複はここで検知）
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        return errorResponse("EMAIL_EXISTS", "このメールアドレスは既に登録されています", 409);
      }
      if (code === "auth/invalid-email") {
        return errorResponse("INVALID_EMAIL", "メールアドレスの形式が正しくありません", 400);
      }
      if (code === "auth/weak-password") {
        return errorResponse("WEAK_PASSWORD", "パスワードが弱すぎます", 400);
      }
      console.error("Auth ユーザー作成エラー:", authErr);
      return errorResponse("AUTH_CREATE_FAILED", "アカウントの作成に失敗しました", 500);
    }

    // 2. 加盟店ドキュメント作成（pending 状態）
    //    ステージは本部が後から割り当てるため空、franchise_code も承認時に採番する前提で一旦仮発行
    const provisionalCode = `PENDING-${userRecord.uid.slice(0, 6).toUpperCase()}`;
    const franchiseRef = await adminDb.collection(COLLECTIONS.FRANCHISES).add({
      name,
      email,
      auth_uid: userRecord.uid,
      franchise_code: provisionalCode,
      stage_id: "",
      stage_name: "",
      area: null,
      prefecture: null,
      address: null,
      phone: null,
      business_hours: null,
      regular_holiday: null,
      instagram: null,
      note: null,
      registration_completed: false,
      is_active: true,
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    const franchiseId = franchiseRef.id;

    // 3. カスタムクレーム設定
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: USER_ROLES.FRANCHISE,
      franchise_id: franchiseId,
    });

    // 4. users コレクション
    await adminDb.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role: USER_ROLES.FRANCHISE,
      franchise_id: franchiseId,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    return successResponse(
      {
        id: franchiseId,
        name,
        email,
        status: "pending",
      },
      201
    );
  } catch (err) {
    console.error("加盟店セルフ登録エラー:", err);
    return errorResponse("INTERNAL_ERROR", "登録に失敗しました", 500);
  }
}
