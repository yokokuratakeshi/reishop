// 加盟店管理 API
// GET: 一覧取得 / POST: 新規追加

import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { sendFranchiseAccountEmail } from "@/lib/utils/mail";

const franchiseSchema = z.object({
  name: z.string().min(1, "加盟店名は必須です"),
  franchise_code: z.string().min(1, "加盟店コードは必須です"),
  stage_id: z.string().min(1, "ステージは必須です"),
  stage_name: z.string().min(1),
  area: z.string().optional().nullable(),
  email: z.string().email("有効なメールアドレスを入力してください").optional().nullable(),
  password: z.string().min(6, "パスワードは6文字以上必要です").optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.FRANCHISES)
        .orderBy("franchise_code", "asc")
        .get();
  
      const franchises = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((f: any) => f.is_active !== false);
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

    const { email, password, ...rest } = parsed.data;
    const now = FieldValue.serverTimestamp();
    
    // 1. 加盟店ドキュメント作成
    const docRef = await adminDb.collection(COLLECTIONS.FRANCHISES).add({
      ...rest,
      email: email || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const franchiseId = docRef.id;

    // 2. ログインアカウント（Auth）の作成
    if (email && password) {
      try {
        const userRecord = await adminAuth.createUser({
          email,
          password,
          displayName: rest.name,
        });

        // カスタムクレーム設定
        await adminAuth.setCustomUserClaims(userRecord.uid, {
          role: USER_ROLES.FRANCHISE,
          franchise_id: franchiseId,
        });

        // users コレクションにも保存
        await adminDb.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
          uid: userRecord.uid,
          email,
          name: rest.name,
          role: USER_ROLES.FRANCHISE,
          franchise_id: franchiseId,
          is_active: true,
          created_at: now,
          updated_at: now,
        });

        // 加盟店ドキュメントに UID を紐付け
        await docRef.update({
          auth_uid: userRecord.uid,
          updated_at: now,
        });

        // パスワード設定メールを加盟店に送信
        try {
          const resetLink = await adminAuth.generatePasswordResetLink(email);
          const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://fc-ordering-tool.vercel.app"}/login`;

          await sendFranchiseAccountEmail({
            to: email,
            franchiseName: rest.name,
            loginUrl,
            passwordResetLink: resetLink,
          });
        } catch (mailErr) {
          console.error("アカウント通知メール送信エラー:", mailErr);
          // メール送信失敗してもアカウント作成は成功とする
        }
      } catch (authErr: any) {
        console.error("Auth ユーザー作成エラー:", authErr);
        // Auth 作成失敗しても加盟店作成は成功とするが、エラーメッセージは返す
        return successResponse({ 
          id: franchiseId, 
          ...rest, 
          email,
          is_active: true,
          warning: "加盟店は作成されましたが、ログインアカウントの作成に失敗しました（既にメールアドレスが使われている可能性があります）" 
        }, 201);
      }
    }

    return successResponse({ id: franchiseId, ...rest, email, is_active: true }, 201);
  } catch (err) {
    console.error("加盟店追加エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの追加に失敗しました", 500);
  }
}
