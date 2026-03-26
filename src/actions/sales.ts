"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid, runTransaction, createVoucher } from "@/lib/db/client";
import { z } from "zod";

const saleSchema = z.object({
  client_id: z.string().min(1, "거래처를 선택하세요"),
  sale_date: z.string().min(1, "매출일을 입력하세요"),
  item_description: z.string().min(1, "품목을 입력하세요"),
  supply_amount: z.number().positive("공급가액을 입력하세요"),
  tax_amount: z.number().min(0).default(0),
  is_tax_invoice: z.boolean().default(false),
  invoice_number: z.string().optional(),
  memo: z.string().optional(),
});

export async function createSale(formData: FormData) {
  const supplyAmount = Number(formData.get("supply_amount")) || 0;
  const taxAmount = Number(formData.get("tax_amount")) || 0;
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

  const saleId = uuid();

  try {
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
  execute("UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, id);
  revalidatePath("/sales");
  return { success: true };
}

export async function deleteSale(id: string) {
  runTransaction(() => {
    execute("DELETE FROM voucher_lines WHERE voucher_id IN (SELECT id FROM vouchers WHERE sale_id = ?)", id);
    execute("DELETE FROM vouchers WHERE sale_id = ?", id);
    execute("DELETE FROM sales WHERE id = ?", id);
  });
  revalidatePath("/sales");
  revalidatePath("/vouchers");
  revalidatePath("/dashboard");
  return { success: true };
}
