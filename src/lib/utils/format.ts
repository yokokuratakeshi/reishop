// 価格・日付などのフォーマットユーティリティ

// 通貨フォーマット（例: 3024 → "¥3,024"）
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

// 日付フォーマット（例: Timestamp | Date | string | number → "2026年3月22日"）
export function formatDate(timestamp: unknown): string {
  if (!timestamp) return "—";
  
  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp && typeof (timestamp as any).toDate === "function") {
    date = (timestamp as any).toDate();
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    return "—";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// 日時フォーマット（例: Timestamp | Date | string | number → "2026年3月22日 11:30"）
export function formatDateTime(timestamp: unknown): string {
  if (!timestamp) return "—";

  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (timestamp && typeof (timestamp as any).toDate === "function") {
    date = (timestamp as any).toDate();
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    return "—";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 年月フォーマット（例: "2026-03" → "2026年3月"）
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${parseInt(month)}月`;
}

// 属性値マップを読みやすい文字列に変換（例: { "カラー": "白", "サイズ": "M" } → "白 / M"）
export function formatAttributeValues(
  attributeValues: Record<string, string>
): string {
  return Object.values(attributeValues).join(" / ");
}

// 発注番号を生成（例: "ORD-2026-03-0001"）
export function generateOrderNumber(
  year: number,
  month: number,
  sequence: number
): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedSequence = String(sequence).padStart(4, "0");
  return `ORD-${year}-${paddedMonth}-${paddedSequence}`;
}

// 請求番号を生成（例: "INV-2026-03-FC001"）
export function generateInvoiceNumber(
  yearMonth: string,
  franchiseNo: number
): string {
  const paddedFranchiseNo = String(franchiseNo).padStart(3, "0");
  return `INV-${yearMonth}-FC${paddedFranchiseNo}`;
}
