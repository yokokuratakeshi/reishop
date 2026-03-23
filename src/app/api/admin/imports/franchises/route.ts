import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const franchiseImportRowSchema = z.object({
  id: z.string().optional().nullable(),
  franchise_code: z.string().min(1, "加盟店コードは必須です"),
  name: z.string().min(1, "店舗名は必須です"),
  postal_code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("有効なメールアドレスを入力してください").optional().nullable(),
  stage_id: z.string().optional().nullable(),
  stage_name: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return errorResponse("BAD_REQUEST", "リクエストボディは配列形式である必要があります", 400);
    }

    // ステージ一覧を取得（名称からIDを解決するため、またはその逆）
    const stagesSnapshot = await adminDb.collection(COLLECTIONS.STAGES).get();
    const stages = stagesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    const batch = adminDb.batch();
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      let row = body[i];
      
      // 日本語ヘッダーのマッピング
      const mappedRow: any = { ...row };
      const mappings: Record<string, string> = {
        "店舗コード": "franchise_code",
        "加盟店コード": "franchise_code",
        "店名": "name",
        "店舗名": "name",
        "加盟店名": "name",
        "郵便番号": "postal_code",
        "住所": "address",
        "電話番号": "phone",
        "メールアドレス": "email",
        "メール": "email",
        "ステージ": "stage_name",
        "エリア": "area",
        "都道府県": "prefecture"
      };

      Object.entries(mappings).forEach(([jp, en]) => {
        if (row[jp] !== undefined && row[en] === undefined) {
          mappedRow[en] = row[jp];
        }
      });

      const parsed = franchiseImportRowSchema.safeParse(mappedRow);
      
      if (!parsed.success) {
        errors.push(`行 ${i + 1}: ${parsed.error.issues.map(e => e.message).join(", ")}`);
        continue;
      }

      const { id, stage_id, stage_name, ...data } = parsed.data;
      
      // ステージの解決
      let finalStageId = stage_id;
      let finalStageName = stage_name;

      if (stage_id) {
        const stage = stages.find(s => s.id === stage_id);
        if (stage) finalStageName = stage.name;
      } else if (stage_name) {
        const stage = stages.find(s => s.name === stage_name);
        if (stage) {
          finalStageId = stage.id;
          finalStageName = stage.name;
        }
      }

      if (!finalStageId) {
        errors.push(`行 ${i + 1}: ステージが見つかりません (${stage_id || stage_name})`);
        continue;
      }

      const now = FieldValue.serverTimestamp();
      const franchiseData = {
        ...data,
        stage_id: finalStageId,
        stage_name: finalStageName,
        is_active: true,
        updated_at: now,
      };

      if (id) {
        // 更新
        const docRef = adminDb.collection(COLLECTIONS.FRANCHISES).doc(id);
        batch.set(docRef, franchiseData, { merge: true });
      } else {
        // 新規追加
        const docRef = adminDb.collection(COLLECTIONS.FRANCHISES).doc();
        batch.set(docRef, {
          ...franchiseData,
          created_at: now,
        });
      }
      successCount++;
    }

    if (successCount > 0) {
      await batch.commit();
    }

    return successResponse({
      successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // 最初のエラー10件のみ返す
    });
  } catch (err: any) {
    console.error("Franchise import error:", err);
    return errorResponse("INTERNAL_ERROR", `インポートに失敗しました: ${err.message}`, 500);
  }
}
