"use server";

import { revalidatePath } from "next/cache";
import { execute, runTransaction, createVoucher, queryOne, queryAll, softDelete, auditLog, checkFiscalPeriodOpen } from "@/lib/db/client";

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

  // Validate no negative amounts
  for (const line of data.lines) {
    if (line.debitAmount < 0 || line.creditAmount < 0) {
      return { error: "음수 금액은 허용되지 않습니다." };
    }
  }

  try {
    // Check fiscal period is open
    checkFiscalPeriodOpen(data.voucherDate);

    runTransaction(() => {
      createVoucher({
        voucherType: data.voucherType,
        voucherDate: data.voucherDate,
        description: data.description,
        accountId: data.accountId,
        lines: data.lines,
      });

      // Update account balance for deposit/withdrawal/transfer vouchers
      if (data.accountId && (data.voucherType === "deposit" || data.voucherType === "withdrawal" || data.voucherType === "transfer")) {
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
      const voucher = queryOne<{ voucher_type: string; account_id: string | null; voucher_date: string }>(
        "SELECT voucher_type, account_id, voucher_date FROM vouchers WHERE id = ? AND is_deleted = 0", id
      );
      if (!voucher) throw new Error("전표를 찾을 수 없습니다.");

      // Check fiscal period
      checkFiscalPeriodOpen(voucher.voucher_date);

      // Reverse account balance if applicable
      if (voucher.account_id && (voucher.voucher_type === "deposit" || voucher.voucher_type === "withdrawal" || voucher.voucher_type === "transfer")) {
        const account = queryOne<{ account_code: string }>("SELECT account_code FROM accounts WHERE id = ?", voucher.account_id);
        if (account) {
          const lines = queryAll<{ debit_amount: number; credit_amount: number }>(
            "SELECT debit_amount, credit_amount FROM voucher_lines WHERE voucher_id = ? AND account_code = ?",
            id, account.account_code
          );
          for (const line of lines) {
            const delta = -(line.debit_amount - line.credit_amount);
            execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", delta, voucher.account_id);
          }
        }
      }

      // Soft delete instead of hard delete
      softDelete("vouchers", id);
    });

    revalidatePath("/vouchers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "전표 삭제에 실패했습니다." };
  }
}
