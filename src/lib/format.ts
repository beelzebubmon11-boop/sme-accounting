/**
 * Format a number as Korean Won (KRW)
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with comma separators (no currency symbol)
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

/**
 * Format a date string to Korean format (YYYY년 MM월 DD일)
 */
export function formatDateKR(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Format a date string to short format (YYYY-MM-DD)
 */
export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Parse a KRW formatted string back to number
 */
export function parseKRW(value: string): number {
  return Number(value.replace(/[^0-9-]/g, "")) || 0;
}
