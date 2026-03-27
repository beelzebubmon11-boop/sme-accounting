"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid, runTransaction, createVoucher, existsInTable, softDelete, checkFiscalPeriodOpen } from "@/lib/db/client";
import { z } from "zod";

const saleSchema = z.object({
  client_id: z.string().min(1, "거래처를 선택하세요"),
  sale_date: z.string().min(1, "매출일을 입력하세요").regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식: YYYY-MM-DD"),
  item_description: z.string().min(1, "품목을 입력하세요").max(200, "품목명은 200자 이내로 입력하세요"),
  supply_amount: z.number().positive("공급가액은 0보다 커야 합니다").int("금액은 정수로 입력하세요"),
  tax_amount: z.number().min(0, "세액은 0 이상이어야 합니다").int("금액은 정수로 입력하세요").default(0),
  is_tax_invoice: z.boolean().default(false),
  invoice_number: z.string().max(50).optional(),
  memo: z.string().max(500).optional(),
});

export async function createSale(formData: FormData) {
  const supplyAmount = Math.round(Number(formData.get("supply_amount")) || 0);
  const taxAmount = Math.round(Number(formData.get("tax_amount")) || 0);
  const totalAmount = supplyAmount + taxAmount;

  const parsed = saleSchema.safeParse({
    client_id: formData.get("client_id"),
    sale_date: formData.get("sale_date"),
    item_description: formData.get("item_description"),
    supply_amount: supplyAmount,
    tax_amount: taxAmount,
    is_tax_invoice: formData.get("is_tax_invoice") === "true",
    invoice_number: formData.get("invoice_number") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate FK existence
  if (!existsInTable("clients", parsed.data.client_id)) {
    return { error: "존재하지 않는 거래처입니다." };
  }

  const saleId = uuid();

  try {
    checkFiscalPeriodOpen(parsed.data.sale_date);

    runTransaction(() => {
      execute(
        `INSERT INTO sales (id, client_id, sale_date, item_description, supply_amount, tax_amount, total_amount, is_tax_invoice, invoice_number, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        saleId, parsed.data.client_id, parsed.data.sale_date,
        parsed.data.item_description, parsed.data.supply_amount,
        parsed.data.tax_amount, totalAmount,
        parsed.data.is_tax_invoice ? 1 : 0,
        parsed.data.invoice_number || null, parsed.data.memo || null
      );

      const lines: any[] = [
        { accountCode: "108", accountName: "외상매출금", debitAmount: totalAmount, creditAmount: 0, clientId: parsed.data.client_id },
        { accountCode: "401", accountName: "상품매출", debitAmount: 0, creditAmount: parsed.data.supply_amount, clientId: parsed.data.client_id },
      ];
      if (parsed.data.tax_amount > 0) {
        lines.push({ accountCode: "257", accountName: "부가세예수금", debitAmount: 0, creditAmount: parsed.data.tax_amount, clientId: parsed.data.client_id });
      }

      createVoucher({
        voucherType: "sale",
        voucherDate: parsed.data.sale_date,
        description: `매출: ${parsed.data.item_description}`,
        saleId,
        lines,
      });
    });

    revalidatePath("/sales");
    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateSaleStatus(id: string, status: string) {
  const validStatuses = ["unpaid", "partial", "paid"];
  if (!validStatuses.includes(status)) {
    return { error: "유효하지 않은 상태입니다." };
  }
  try {
    execute("UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0", status, id);
    revalidatePath("/sales");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteSale(id: string) {
  try {
    runTransaction(() => {
      // Soft delete vouchers related to this sale
      execute("UPDATE vouchers SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE sale_id = ? AND is_deleted = 0", id);
      softDelete("sales", id);
    });
    revalidatePath("/sales");
    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
