"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid, runTransaction, createVoucher } from "@/lib/db/client";
import { z } from "zod";

const purchaseSchema = z.object({
  client_id: z.string().min(1, "거래처를 선택하세요"),
  purchase_date: z.string().min(1, "매입일을 입력하세요"),
  item_description: z.string().min(1, "품목을 입력하세요"),
  supply_amount: z.number().positive("공급가액을 입력하세요"),
  tax_amount: z.number().min(0).default(0),
  is_tax_invoice: z.boolean().default(false),
  invoice_number: z.string().optional(),
  memo: z.string().optional(),
});

export async function createPurchase(formData: FormData) {
  const supplyAmount = Number(formData.get("supply_amount")) || 0;
  const taxAmount = Number(formData.get("tax_amount")) || 0;
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

  const purchaseId = uuid();

  try {
    runTransaction(() => {
      execute(
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

      createVoucher({
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
  execute("UPDATE purchases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, id);
  revalidatePath("/purchases");
  return { success: true };
}

export async function deletePurchase(id: string) {
  runTransaction(() => {
    execute("DELETE FROM voucher_lines WHERE voucher_id IN (SELECT id FROM vouchers WHERE purchase_id = ?)", id);
    execute("DELETE FROM vouchers WHERE purchase_id = ?", id);
    execute("DELETE FROM purchases WHERE id = ?", id);
  });
  revalidatePath("/purchases");
  revalidatePath("/vouchers");
  revalidatePath("/dashboard");
  return { success: true };
}
