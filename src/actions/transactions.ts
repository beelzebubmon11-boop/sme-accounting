"use server";

import { revalidatePath } from "next/cache";
import { queryOne, execute, runTransaction, createVoucher, existsInTable, checkFiscalPeriodOpen } from "@/lib/db/client";
import { z } from "zod";

const bankTransactionSchema = z.object({
  account_id: z.string().min(1, "계좌를 선택하세요"),
  category_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive("금액은 0보다 커야 합니다").int("금액은 정수로 입력하세요"),
  description: z.string().max(200).optional(),
  transaction_date: z.string().min(1, "거래일을 입력하세요").regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식: YYYY-MM-DD"),
});

export async function createBankTransaction(formData: FormData) {
  const parsed = bankTransactionSchema.safeParse({
    account_id: formData.get("account_id"),
    category_id: formData.get("category_id") || null,
    client_id: formData.get("client_id") || null,
    type: formData.get("type"),
    amount: Math.round(Number(formData.get("amount")) || 0),
    description: formData.get("description") || undefined,
    transaction_date: formData.get("transaction_date"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate FK existence
  if (!await existsInTable("accounts", parsed.data.account_id)) {
    return { error: "존재하지 않는 계좌입니다." };
  }
  if (parsed.data.client_id && !await existsInTable("clients", parsed.data.client_id)) {
    return { error: "존재하지 않는 거래처입니다." };
  }

  const account = await queryOne<{ account_code: string; current_balance: number }>(
    "SELECT account_code, current_balance FROM accounts WHERE id = ? AND is_deleted = 0", parsed.data.account_id
  );
  if (!account) return { error: "계좌를 찾을 수 없습니다." };

  const category = parsed.data.category_id
    ? await queryOne<{ account_code: string; account_name: string }>(
        "SELECT account_code, account_name FROM categories WHERE id = ?", parsed.data.category_id
      )
    : null;

  const bankCode = account.account_code || "103";
  const catCode = category?.account_code || "999";
  const catName = category?.account_name || "미분류";

  try {
    await checkFiscalPeriodOpen(parsed.data.transaction_date);

    await runTransaction(async () => {
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

      await createVoucher({
        voucherType: voucherType as any,
        voucherDate: parsed.data.transaction_date,
        description: parsed.data.description || (voucherType === "deposit" ? "입금" : "출금"),
        accountId: parsed.data.account_id,
        lines,
      });

      // Update account balance
      const delta = parsed.data.type === "deposit" ? parsed.data.amount : -parsed.data.amount;
      await execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
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
