"use server";

import { revalidatePath } from "next/cache";
import { queryOne, queryAll, execute, runTransaction, createVoucher, checkFiscalPeriodOpen } from "@/lib/db/client";

export async function createReversalVoucher(voucherId: string, reversalDate: string) {
  try {
    const voucher = await queryOne<{
      id: string;
      voucher_no: string;
      voucher_type: string;
      voucher_date: string;
      description: string;
      account_id: string | null;
      is_deleted: number;
      is_reversal: number;
    }>("SELECT * FROM vouchers WHERE id = ? AND is_deleted = 0", voucherId);

    if (!voucher) {
      return { error: "전표를 찾을 수 없습니다." };
    }

    if (voucher.is_reversal) {
      return { error: "역분개 전표는 다시 역분개할 수 없습니다." };
    }

    // Validate reversal date period is open
    await checkFiscalPeriodOpen(reversalDate);

    const lines = await queryAll<{
      account_code: string;
      account_name: string;
      debit_amount: number;
      credit_amount: number;
      client_id: string | null;
      description: string | null;
    }>("SELECT account_code, account_name, debit_amount, credit_amount, client_id, description FROM voucher_lines WHERE voucher_id = ? ORDER BY line_order", voucherId);

    if (lines.length === 0) {
      return { error: "전표 라인이 없습니다." };
    }

    // Reverse: swap debit and credit
    const reversedLines = lines.map(l => ({
      accountCode: l.account_code,
      accountName: l.account_name,
      debitAmount: l.credit_amount,   // swap
      creditAmount: l.debit_amount,   // swap
      clientId: l.client_id,
      description: l.description ? `[역분개] ${l.description}` : "[역분개]",
    }));

    await runTransaction(async () => {
      const reversalId = await createVoucher({
        voucherType: voucher.voucher_type as any,
        voucherDate: reversalDate,
        description: `[역분개] ${voucher.description || voucher.voucher_no}`,
        accountId: voucher.account_id,
        lines: reversedLines,
      });

      // Mark as reversal
      await execute(
        "UPDATE vouchers SET is_reversal = 1, reversal_of = ? WHERE id = ?",
        voucherId, reversalId
      );

      // Reverse account balance if deposit/withdrawal/transfer
      if (voucher.account_id && ["deposit", "withdrawal", "transfer"].includes(voucher.voucher_type)) {
        const account = await queryOne<{ account_code: string }>("SELECT account_code FROM accounts WHERE id = ?", voucher.account_id);
        if (account) {
          for (const line of lines) {
            if (line.account_code === account.account_code) {
              // Original was debit-credit, reversal is -(debit-credit)
              const delta = -(line.debit_amount - line.credit_amount);
              await execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", delta, voucher.account_id);
            }
          }
        }
      }
    });

    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "역분개 생성에 실패했습니다." };
  }
}
