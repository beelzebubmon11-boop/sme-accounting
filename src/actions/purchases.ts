"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid, runTransaction, createVoucher, existsInTable, softDelete, checkFiscalPeriodOpen } from "@/lib/db/client";
import { z } from "zod";

const purchaseSchema = z.object({
  client_id: z.string().min(1, "거래처를 선택하세요"),
  purchase_date: z.string().min(1, "매입일을 입력하세요").regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식: YYYY-MM-DD"),
  item_description: z.string().min(1, "품목을 입력하세요").max(200, "품목명은 200자 이내로 입력하세요"),
  supply_amount: z.number().positive("공급가액은 0보다 커야 합니다").int("금액은 정수로 입력하세요"),
  tax_amount: z.number().min(0, "세액은 0 이상이어야 합니다").int("금액은 정수로 입력하세요").default(0),
  is_tax_invoice: z.boolean().default(false),
  invoice_number: z.string().max(50).optional(),
  memo: z.string().max(500).optional(),
});

export async function createPurchase(formData: FormData) {
  const supplyAmount = Math.round(Number(formData.get("supply_amount")) || 0);
  const taxAmount = Math.round(Number(formData.get("tax_amount")) || 0);
  const totalAmount = supplyAmount + taxAmount;

  const parsed = purchaseSchema.safeParse({
    client_id: formData.get("client_id"),
    purchase_date: formData.get("purchase_date"),
    item_description: formData.get("item_description"),
    supply_amount: supplyAmount,
    tax_amount: taxAmount,
    is_tax_invoice: formData.get("is_tax_invoice") === "true",
    invoice_number: formData.get("invoice_number") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate FK existence
  if (!await existsInTable("clients", parsed.data.client_id)) {
    return { error: "존재하지 않는 거래처입니다." };
  }

  const purchaseId = uuid();

  try {
    await checkFiscalPeriodOpen(parsed.data.purchase_date);

    await runTransaction(async () => {
      await execute(
        `INSERT INTO purchases (id, client_id, purchase_date, item_description, supply_amount, tax_amount, total_amount, is_tax_invoice, invoice_number, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        purchaseId, parsed.data.client_id, parsed.data.purchase_date,
        parsed.data.item_description, parsed.data.supply_amount,
        parsed.data.tax_amount, totalAmount,
        parsed.data.is_tax_invoice ? 1 : 0,
        parsed.data.invoice_number || null, parsed.data.memo || null
      );

      const lines: any[] = [
        { accountCode: "501", accountName: "상품매입", debitAmount: parsed.data.supply_amount, creditAmount: 0, clientId: parsed.data.client_id },
      ];
      if (parsed.data.tax_amount > 0) {
        lines.push({ accountCode: "124", accountName: "부가세대급금", debitAmount: parsed.data.tax_amount, creditAmount: 0, clientId: parsed.data.client_id });
      }
      lines.push({ accountCode: "251", accountName: "외상매입금", debitAmount: 0, creditAmount: totalAmount, clientId: parsed.data.client_id });

      await createVoucher({
        voucherType: "purchase",
        voucherDate: parsed.data.purchase_date,
        description: `매입: ${parsed.data.item_description}`,
        purchaseId,
        lines,
      });
    });

    revalidatePath("/purchases");
    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updatePurchaseStatus(id: string, status: string) {
  const validStatuses = ["unpaid", "partial", "paid"];
  if (!validStatuses.includes(status)) {
    return { error: "유효하지 않은 상태입니다." };
  }
  try {
    await execute("UPDATE purchases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0", status, id);
    revalidatePath("/purchases");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deletePurchase(id: string) {
  try {
    await runTransaction(async () => {
      // Soft delete vouchers related to this purchase
      await execute("UPDATE vouchers SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE purchase_id = ? AND is_deleted = 0", id);
      await softDelete("purchases", id);
    });
    revalidatePath("/purchases");
    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
