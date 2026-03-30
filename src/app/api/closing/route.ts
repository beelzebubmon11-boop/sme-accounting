import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne, execute, uuid, runTransaction, createVoucher } from "@/lib/db/client";

export async function GET() {
  const closings = await queryAll(
    "SELECT * FROM fiscal_closings ORDER BY fiscal_year DESC"
  );
  return NextResponse.json(closings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fiscal_year } = body;

    if (!fiscal_year) {
      return NextResponse.json({ error: "회계연도를 입력하세요." }, { status: 400 });
    }

    // Check if already closed
    const existing = await queryOne<any>(
      "SELECT id FROM fiscal_closings WHERE fiscal_year = ? AND status = 'closed'",
      fiscal_year
    );

    if (existing) {
      return NextResponse.json(
        { error: `${fiscal_year}년은 이미 결산 마감되었습니다.` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const closingId = uuid();
    const startDate = `${fiscal_year}-01-01`;
    const endDate = `${fiscal_year}-12-31`;

    await runTransaction(async () => {
      // 1. Calculate net income (revenue - expense)
      const revenueData = await queryAll<{ code: string; name: string; amount: number }>(`
        SELECT coa.code, coa.name,
          COALESCE(SUM(vl.credit_amount) - SUM(vl.debit_amount), 0) as amount
        FROM voucher_lines vl
        JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0 AND v.is_closing = 0
        JOIN chart_of_accounts coa ON coa.code = vl.account_code
        WHERE coa.category = 'revenue'
        AND v.voucher_date >= ? AND v.voucher_date <= ?
        GROUP BY coa.code, coa.name
        HAVING amount != 0
      `, startDate, endDate);

      const expenseData = await queryAll<{ code: string; name: string; amount: number }>(`
        SELECT coa.code, coa.name,
          COALESCE(SUM(vl.debit_amount) - SUM(vl.credit_amount), 0) as amount
        FROM voucher_lines vl
        JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0 AND v.is_closing = 0
        JOIN chart_of_accounts coa ON coa.code = vl.account_code
        WHERE coa.category = 'expense'
        AND v.voucher_date >= ? AND v.voucher_date <= ?
        GROUP BY coa.code, coa.name
        HAVING amount != 0
      `, startDate, endDate);

      const totalRevenue = revenueData.reduce((s, r) => s + r.amount, 0);
      const totalExpense = expenseData.reduce((s, r) => s + r.amount, 0);
      const netIncome = totalRevenue - totalExpense;

      // 2. Create closing entries (마감분개)
      // Close revenue accounts: Dr Revenue / Cr Retained Earnings
      if (revenueData.length > 0) {
        const lines = revenueData.map(r => ({
          accountCode: r.code,
          accountName: r.name,
          debitAmount: r.amount,
          creditAmount: 0,
          description: "결산 마감분개 - 수익 마감",
        }));
        lines.push({
          accountCode: "341",
          accountName: "이익잉여금",
          debitAmount: 0,
          creditAmount: totalRevenue,
          description: "결산 마감분개 - 수익 → 이익잉여금",
        });

        await createVoucher({
          voucherType: "general",
          voucherDate: endDate,
          description: `${fiscal_year}년 수익 마감분개`,
          isClosing: true,
          lines,
        });
      }

      // Close expense accounts: Dr Retained Earnings / Cr Expense
      if (expenseData.length > 0) {
        const lines = [
          {
            accountCode: "341",
            accountName: "이익잉여금",
            debitAmount: totalExpense,
            creditAmount: 0,
            description: "결산 마감분개 - 비용 → 이익잉여금",
          },
          ...expenseData.map(e => ({
            accountCode: e.code,
            accountName: e.name,
            debitAmount: 0,
            creditAmount: e.amount,
            description: "결산 마감분개 - 비용 마감",
          })),
        ];

        await createVoucher({
          voucherType: "general",
          voucherDate: endDate,
          description: `${fiscal_year}년 비용 마감분개`,
          isClosing: true,
          lines,
        });
      }

      // 3. Generate opening balances for next year (기초잔액 이월)
      const nextYear = fiscal_year + 1;
      // Delete existing opening balances for next year
      await execute("DELETE FROM opening_balances WHERE fiscal_year = ?", nextYear);

      // Get all BS account balances (asset, liability, equity)
      const bsBalances = await queryAll<{ code: string; name: string; category: string; balance: number }>(`
        SELECT coa.code, coa.name, coa.category,
          COALESCE(SUM(vl.debit_amount), 0) - COALESCE(SUM(vl.credit_amount), 0) as balance
        FROM chart_of_accounts coa
        LEFT JOIN voucher_lines vl ON vl.account_code = coa.code
        LEFT JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0
        WHERE coa.is_active = 1 AND coa.category IN ('asset', 'liability', 'equity')
        AND (v.voucher_date <= ? OR v.voucher_date IS NULL)
        GROUP BY coa.code, coa.name, coa.category
        HAVING balance != 0
      `, endDate);

      for (const b of bsBalances) {
        const debitBalance = b.balance > 0 ? b.balance : 0;
        const creditBalance = b.balance < 0 ? -b.balance : 0;

        await execute(
          `INSERT INTO opening_balances (id, fiscal_year, account_code, account_name, debit_balance, credit_balance)
           VALUES (?, ?, ?, ?, ?, ?)`,
          uuid(), nextYear, b.code, b.name, debitBalance, creditBalance
        );
      }

      // 4. Record fiscal closing
      await execute(
        `INSERT INTO fiscal_closings (id, fiscal_year, closing_date, status, closed_at)
         VALUES (?, ?, ?, 'closed', ?)`,
        closingId, fiscal_year, today, now
      );
    });

    return NextResponse.json({ id: closingId, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
