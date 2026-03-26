"use server";

import { revalidatePath } from "next/cache";
import { uuid, execute, runTransaction, createVoucher, queryOne } from "@/lib/db/client";

export async function createVoucherAction(data: {
  voucherType: "deposit" | "withdrawal" | "transfer" | "sale" | "purchase" | "general";
  voucherDate: string;
  description: string;
  accountId?: string | null;
  lines: {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    clientId?: string | null;
    description?: string;
  }[];
}) {
  // Validate debit/credit balance
  const totalDebit = data.lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + l.creditAmount, 0);

  if (totalDebit !== totalCredit) {
    return { error: `차변(${totalDebit.toLocaleString()})과 대변(${totalCredit.toLocaleString()})이 일치하지 않습니다.` };
  }

  if (totalDebit === 0) {
    return { error: "금액을 입력하세요." };
  }

  if (!data.voucherDate) {
    return { error: "전표일을 입력하세요." };
  }

  try {
    runTransaction(() => {
      createVoucher({
        voucherType: data.voucherType,
        voucherDate: data.voucherDate,
        description: data.description,
        accountId: data.accountId,
        lines: data.lines,
      });

      // Update account balance for deposit/withdrawal vouchers
      if (data.accountId && (data.voucherType === "deposit" || data.voucherType === "withdrawal")) {
        const account = queryOne<{ account_code: string }>("SELECT account_code FROM accounts WHERE id = ?", data.accountId);
        if (account) {
          const bankLine = data.lines.find(l => l.accountCode === account.account_code);
          if (bankLine) {
            const delta = bankLine.debitAmount - bankLine.creditAmount;
            execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", delta, data.accountId);
          }
        }
      }
    });

    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "전표 생성에 실패했습니다." };
  }
}

export async function deleteVoucherAction(id: string) {
  try {
    runTransaction(() => {
      // Reverse account balance if applicable
      const voucher = queryOne<{ voucher_type: string; account_id: string | null }>(
        "SELECT voucher_type, account_id FROM vouchers WHERE id = ?", id
      );
      if (voucher?.account_id) {
        const account = queryOne<{ account_code: string }>("SELECT account_code FROM accounts WHERE id = ?", voucher.account_id);
        if (account) {
          const lines = (require("@/lib/db/client").queryAll as typeof import("@/lib/db/client").queryAll)(
            "SELECT debit_amount, credit_amount, account_code FROM voucher_lines WHERE voucher_id = ? AND account_code = ?",
            id, account.account_code
          );
          for (const line of lines) {
            const delta = -(line.debit_amount - line.credit_amount);
            execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", delta, voucher.account_id);
          }
        }
      }

      execute("DELETE FROM voucher_lines WHERE voucher_id = ?", id);
      execute("DELETE FROM vouchers WHERE id = ?", id);
    });

    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "전표 삭제에 실패했습니다." };
  }
}
