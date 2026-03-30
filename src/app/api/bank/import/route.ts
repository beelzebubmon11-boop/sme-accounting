import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, runTransaction, createVoucher } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const { accountId, rows } = await request.json();

    if (!accountId || !rows || rows.length === 0) {
      return NextResponse.json({ error: "계좌와 데이터가 필요합니다." });
    }

    const account = await queryOne<{ id: string; account_code: string; current_balance: number }>(
      "SELECT id, account_code, current_balance FROM accounts WHERE id = ?", accountId
    );
    if (!account) {
      return NextResponse.json({ error: "계좌를 찾을 수 없습니다." });
    }

    const bankCode = account.account_code || "103";
    let imported = 0;

    await runTransaction(async () => {
      for (const row of rows) {
        if (!row.date) continue;
        const isDeposit = row.deposit > 0;
        const amount = isDeposit ? row.deposit : row.withdrawal;
        if (amount <= 0) continue;

        const voucherType = isDeposit ? "deposit" : "withdrawal";
        const lines = isDeposit
          ? [
              { accountCode: bankCode, accountName: "보통예금", debitAmount: amount, creditAmount: 0, description: row.description },
              { accountCode: "999", accountName: "미분류", debitAmount: 0, creditAmount: amount, description: row.description },
            ]
          : [
              { accountCode: "999", accountName: "미분류", debitAmount: amount, creditAmount: 0, description: row.description },
              { accountCode: bankCode, accountName: "보통예금", debitAmount: 0, creditAmount: amount, description: row.description },
            ];

        await createVoucher({
          voucherType: voucherType as any,
          voucherDate: row.date,
          description: row.description || (isDeposit ? "입금" : "출금"),
          accountId,
          lines,
        });

        // Update balance
        const delta = isDeposit ? amount : -amount;
        await execute("UPDATE accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", delta, accountId);

        imported++;
      }
    });

    return NextResponse.json({ success: true, imported });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
