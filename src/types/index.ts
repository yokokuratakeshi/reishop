import { Timestamp } from "firebase/firestore";

// ----------------------
// ステージ（期）
// ----------------------
export interface Stage {
  id: string;
  name: string; // "0期", "0.5期"
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ----------------------
// ユーザー
// ----------------------
export type UserRole = "admin" | "franchise";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  franchise_id: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ----------------------
// 加盟店
// ----------------------
export interface Franchise {
  id: string;
  franchise_code: string;
  no: number;
  name: string;

  area: string;
  prefecture: string;
  address: string | null;
  phone: string | null;
  business_hours: string | null;
  regular_holiday: string | null;
  instagram: string | null;
  note: string | null;
  stage_id: string;
  stage_name: string;
  registration_completed: boolean;
  email: string | null;
  auth_uid?: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ----------------------
// カテゴリ
// ----------------------
export interface Category {
  id: string;
  name: string;
  color?: string; // カテゴリ識別用カラー（例: "#3B82F6"）
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ----------------------
// 商品
// ----------------------


export interface Product {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  image_url: string | null;
  product_type?: string; // レガシー（未使用）
  retail_price: number | null; // 管理画面のみ表示
  retail_price_tax_incl: number | null; // 管理画面のみ表示
  has_variants: boolean;
  variants?: ProductVariant[];
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// 属性グループ（サブコレクション）
export interface ProductAttribute {
  id: string;
  name: string; // "カラー", "サイズ", "ロゴタイプ", "プラン"
  sort_order: number;
  is_active: boolean;
  options?: AttributeOption[]; // フロント側で結合する場合
}

// 属性オプション（サブコレクション）
export interface AttributeOption {
  id: string;
  name: string; // "白", "S", "大ロゴ入り"
  display_name: string | null; // "S 内周15.5㌢"
  sort_order: number;
  is_active: boolean;
}

// バリアント（サブコレクション）
export interface ProductVariant {
  id: string;
  sku_code: string;
  attribute_values: Record<string, string>; // { "カラー": "白", "サイズ": "M" }
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  prices?: VariantPrice[]; // フロント側で結合する場合
}

// ステージ別価格（サブコレクション）
export interface VariantPrice {
  id: string;
  stage_id: string;
  stage_name: string;
  wholesale_price: number; // FC卸
  is_active: boolean;
}

// ----------------------
// 発注
// ----------------------
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  order_number: string; // "ORD-2026-03-0001"
  franchise_id: string;
  franchise_name: string;
  franchise_no: number;
  stage_id: string;
  stage_name: string;
  status: OrderStatus;
  total_amount: number;
  item_count: number;
  total_quantity: number;
  ordered_at: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  note: string | null;
}

// 発注明細（サブコレクション）
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  sku_code: string;
  attribute_values: Record<string, string>;
  wholesale_price: number;
  quantity: number;
  subtotal: number;
}

// ----------------------
// 請求書
// ----------------------
export type InvoiceStatus = "draft" | "issued" | "paid";

export interface Invoice {
  id: string;
  invoice_number: string; // "INV-2026-03-FC001"
  franchise_id: string;
  franchise_name: string;
  franchise_no: number;
  year_month: string; // "2026-03"
  order_ids: string[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  status: InvoiceStatus;
  issued_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ----------------------
// 招待リンク
// ----------------------
export interface Invitation {
  id: string;
  franchise_id: string;
  token: string;
  expires_at: Timestamp;
  used: boolean;
  created_at: Timestamp;
  used_at?: Timestamp | null;
}

// ----------------------
// カート（クライアント状態 / Zustand）
// ----------------------
export interface CartItem {
  id: string; // ユニークキー（variant_id + timestamp）
  product_id: string;
  product_name: string;
  variant_id: string;
  sku_code: string;
  attribute_values: Record<string, string>;
  wholesale_price: number;
  quantity: number;
}
