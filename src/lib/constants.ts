// Firestoreのコレクション名を定数として管理
// マジックストリング禁止ルールに従い、全てここで定義する

export const COLLECTIONS = {
  STAGES: "stages",
  USERS: "users",
  FRANCHISES: "franchises",
  CATEGORIES: "categories",
  PRODUCTS: "products",
  ORDERS: "orders",
  INVOICES: "invoices",
} as const;

export const SUBCOLLECTIONS = {
  ATTRIBUTES: "attributes",
  OPTIONS: "options",
  VARIANTS: "variants",
  PRICES: "prices",
  ITEMS: "items",
} as const;

// ユーザーロール
export const USER_ROLES = {
  ADMIN: "admin",
  FRANCHISE: "franchise",
} as const;

// 商品タイプ
export const PRODUCT_TYPES = {
  APPAREL: "apparel",
  ACCESSORY: "accessory",
  NON_APPAREL: "non_apparel",
} as const;

// 発注ステータス
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "受付",
  processing: "処理中",
  shipped: "出荷済",
  completed: "完了",
  cancelled: "キャンセル",
};

// 請求書ステータス
export const INVOICE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  PAID: "paid",
} as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  issued: "発行済",
  paid: "支払済",
};

// 消費税率（デフォルト）
export const DEFAULT_TAX_RATE = 0.1;

// カートの最大アイテム数
export const MAX_CART_ITEMS = 100;

// エリア一覧（加盟店エリア）
export const FRANCHISE_AREAS = [
  "北海道",
  "関東",
  "北陸",
  "中部",
  "関西",
  "中国",
  "四国",
  "九州・沖縄",
  "韓国",
] as const;
