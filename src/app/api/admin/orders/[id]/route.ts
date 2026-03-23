// インスタンス（注文）ステータス更新 API (Admin)
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse, formatDateToISO } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者権限チェック
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { status } = await request.json();
    const { id: orderId } = await params;

    if (!status) {
      return errorResponse("BAD_REQUEST", "ステータスが指定されていません", 400);
    }

    const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return errorResponse("NOT_FOUND", "注文が見つかりません", 404);
    }

    await orderRef.update({
      status,
      updated_at: new Date(),
    });

    return successResponse({ id: orderId, status });
  } catch (err) {
    console.error("Order update error:", err);
    return errorResponse("INTERNAL_ERROR", "注文ステータスの更新に失敗しました", 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者用詳細取得 API
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { id: orderId } = await params;
    const orderDoc = await adminDb.collection(COLLECTIONS.ORDERS).doc(orderId).get();

    if (!orderDoc.exists) {
      return errorResponse("NOT_FOUND", "注文が見つかりません", 404);
    }

    const data = orderDoc.data()!;
    console.log("Order detail data:", JSON.stringify(data));
    
    // 加盟店名を取得
    let franchiseName = "不明";
    if (data.franchise_id && typeof data.franchise_id === "string") {
      const franchiseDoc = await adminDb.collection(COLLECTIONS.FRANCHISES).doc(data.franchise_id).get();
      franchiseName = franchiseDoc.exists ? franchiseDoc.data()?.name : "不明";
    }

    return successResponse({
      id: orderId,
      ...data,
      franchise_name: franchiseName,
      created_at: formatDateToISO(data.created_at),
      updated_at: formatDateToISO(data.updated_at),
    });
  } catch (err: any) {
    console.error("Order fetch detail error:", err);
    return errorResponse("INTERNAL_ERROR", `注文詳細の取得に失敗しました: ${err.message}`, 500);
  }
}
