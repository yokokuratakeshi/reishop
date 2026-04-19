// 加盟店個別操作 API
// PUT: 編集 / DELETE: 論理削除

import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, USER_ROLES } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const updateFranchiseSchema = z.object({
  name: z.string().min(1).optional(),
  franchise_code: z.string().min(1).optional(),
  stage_id: z.string().min(1).optional(),
  stage_name: z.string().min(1).optional(),
  area: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional().nullable(),
  status: z.enum(["pending", "approved"]).optional(),
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

    const { email, password, ...rest } = parsed.data;
    const now = FieldValue.serverTimestamp();

    // 既存データの取得
    const docRef = adminDb.collection(COLLECTIONS.FRANCHISES).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return errorResponse("NOT_FOUND", "加盟店が見つかりません", 404);
    }
    const currentData = doc.data() as any;

    let authUid = currentData.auth_uid;

    // 1. Auth ユーザーの作成または更新
    if (email || password) {
      if (authUid) {
        // 更新
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (rest.name) updateData.displayName = rest.name;

        await adminAuth.updateUser(authUid, updateData);
        
        // users コレクションも更新
        await adminDb.collection(COLLECTIONS.USERS).doc(authUid).update({
          ...(email ? { email } : {}),
          ...(rest.name ? { name: rest.name } : {}),
          updated_at: now,
        });
      } else if (email && password) {
        // 新規作成（後付け）
        const userRecord = await adminAuth.createUser({
          email,
          password,
          displayName: rest.name || currentData.name,
        });

        authUid = userRecord.uid;

        await adminAuth.setCustomUserClaims(authUid, {
          role: USER_ROLES.FRANCHISE,
          franchise_id: id,
        });

        await adminDb.collection(COLLECTIONS.USERS).doc(authUid).set({
          uid: authUid,
          email,
          name: rest.name || currentData.name,
          role: USER_ROLES.FRANCHISE,
          franchise_id: id,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    // 2. 加盟店ドキュメントの更新
    const updatePayload: any = {
      ...rest,
      updated_at: now,
    };
    if (email) updatePayload.email = email;
    if (authUid) updatePayload.auth_uid = authUid;

    await docRef.update(updatePayload);

    return successResponse({ id, ...updatePayload });
  } catch (err: any) {
    console.error("加盟店更新エラー:", err);
    return errorResponse("INTERNAL_ERROR", err.message || "更新に失敗しました", 500);
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
