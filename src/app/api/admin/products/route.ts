// 商品管理 API
// GET: 一覧取得（フィルタ・ページネーション） / POST: 新規追加

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const productSchema = z.object({
  category_id: z.string().min(1, "カテゴリは必須です"),
  category_name: z.string().min(1),
  name: z.string().min(1, "商品名は必須です"),
  description: z.string().default(""),
  image_url: z.string().nullable().optional(),
  product_type: z.enum(["apparel", "accessory", "non_apparel"]),
  retail_price: z.number().min(0).nullable().optional(),
  retail_price_tax_incl: z.number().min(0).nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    let query = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .orderBy("sort_order", "asc");

    if (categoryId) {
      query = adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .where("category_id", "==", categoryId)
        .orderBy("sort_order", "asc") as typeof query;
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return successResponse(products);
  } catch (err) {
    console.error("商品一覧取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの取得に失敗しました", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection(COLLECTIONS.PRODUCTS).add({
      ...parsed.data,
      has_variants: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    return successResponse(
      { id: docRef.id, ...parsed.data, has_variants: false, is_active: true },
      201
    );
  } catch (err) {
    console.error("商品追加エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの追加に失敗しました", 500);
  }
}
