"use server";

import { revalidatePath } from "next/cache";
import { queryOne, execute, uuid, runTransaction, createVoucher } from "@/lib/db/client";
import { z } from "zod";

const bankTransactionSchema = z.object({
  account_id: z.string().min(1, "계좌를 선택하세요"),
  category_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive("금액은 0보다 커야 합니다"),
  description: z.string().optional(),
  transaction_date: z.string().min(1, "거래일을 입력하세요"),
});

export async function createBankTransaction(formData: FormData) {
  const parsed = bankTransactionSchema.safeParse({
    account_id: formData.get("account_id"),
    category_id: formData.get("category_id") || null,
    client_id: formData.get("client_id") || null,
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    description: formData.get("description") || undefined,
    transaction_date: formData.get("transaction_date"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const account = queryOne<{ account_code: string; current_balance: number }>(
    "SELECT account_code, current_balance FROM accounts WHERE id = ?", parsed.data.account_id
  );
  if (!account) return { error: "계좌를 찾을 수 없습니다." };

  const category = parsed.data.category_id
    ? queryOne<{ account_code: string; account_name: string }>(
        "SELECT account_code, account_name FROM categories WHERE id = ?", parsed.data.category_id
      )
    : null;

  const bankCode = account.account_code || "103";
  const catCode = category?.account_code || "999";
  const catName = category?.account_name || "미분류";

  try {
    runTransaction(() => {
      const voucherType = parsed.data.type === "deposit" ? "deposit" : "withdrawal";
      const lines = parsed.data.type === "deposit"
        ? [
            { accountCode: bankCode, accountName: "보통예금", debitAmount: parsed.data.amount, creditAmount: 0, clientId: parsed.data.client_id },
            { accountCode: catCode, accountName: catName, debitAmount: 0, creditAmount: parsed.data.amount, clientId: parsed.data.client_id },
          ]
        : [
            { accountCode: catCode, accountName: catName, debitAmount: parsed.data.amount, creditAmount: 0, clientId: parsed.data.client_id },
            { accountCode: bankCode, accountName: "보통예금", debitAmount: 0, creditAmount: parsed.data.amount, clientId: parsed.data.client_id },
          ];

      createVoucher({
        voucherType: voucherType as any,
        voucherDate: parsed.data.transaction_date,
        description: parsed.data.description || (voucherType === "deposit" ? "입금" : "출금"),
        accountId: parsed.data.account_id,
        lines,
      });

      // Update account balance
      const delta = parsed.data.type === "deposit" ? parsed.data.amount : -parsed.data.amount;
      execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        delta, parsed.data.account_id);
    });

    revalidatePath("/vouchers");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
