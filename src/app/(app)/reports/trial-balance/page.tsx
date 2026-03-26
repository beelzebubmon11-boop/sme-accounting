import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default function TrialBalancePage() {
  // Get all account balances from voucher_lines + opening_balances
  const currentYear = new Date().getFullYear();

  const balances = queryAll<{
    account_code: string;
    account_name: string;
    category: string;
    sub_category: string;
    total_debit: number;
    total_credit: number;
  }>(`
    SELECT
      coa.code as account_code,
      coa.name as account_name,
      coa.category,
      COALESCE(coa.sub_category, '') as sub_category,
      COALESCE(SUM(vl.debit_amount), 0) as total_debit,
      COALESCE(SUM(vl.credit_amount), 0) as total_credit
    FROM chart_of_accounts coa
    LEFT JOIN voucher_lines vl ON vl.account_code = coa.code
    LEFT JOIN vouchers v ON v.id = vl.voucher_id
    WHERE coa.is_active = 1
    GROUP BY coa.code, coa.name, coa.category, coa.sub_category
    HAVING total_debit > 0 OR total_credit > 0
    ORDER BY coa.code
  `);

  // Include opening balances
  const openings = queryAll<{ account_code: string; debit_balance: number; credit_balance: number }>(
    "SELECT account_code, debit_balance, credit_balance FROM opening_balances WHERE fiscal_year = ?", currentYear
  );
  const openingMap = new Map(openings.map(o => [o.account_code, o]));

  const rows = balances.map(b => {
    const opening = openingMap.get(b.account_code);
    const openDebit = opening?.debit_balance || 0;
    const openCredit = opening?.credit_balance || 0;
    const totalDebit = openDebit + b.total_debit;
    const totalCredit = openCredit + b.total_credit;

    // Balance: asset/expense = debit side, liability/equity/revenue = credit side
    const isDebitNatural = b.category === "asset" || b.category === "expense";
    const balance = totalDebit - totalCredit;
    const debitBalance = balance > 0 ? balance : 0;
    const creditBalance = balance < 0 ? -balance : 0;

    return { ...b, openDebit, openCredit, totalDebit, totalCredit, debitBalance, creditBalance };
  });

  const grandTotalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const grandTotalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const grandDebitBalance = rows.reduce((s, r) => s + r.debitBalance, 0);
  const grandCreditBalance = rows.reduce((s, r) => s + r.creditBalance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">합계잔액시산표</h2>
        <p className="text-muted-foreground">전 계정의 차변/대변 합계 및 잔액</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead rowSpan={2} className="border-r">코드</TableHead>
                <TableHead rowSpan={2} className="border-r">계정과목</TableHead>
                <TableHead colSpan={2} className="text-center border-r">합 계</TableHead>
                <TableHead colSpan={2} className="text-center">잔 액</TableHead>
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableHead className="text-right">차변</TableHead>
                <TableHead className="text-right border-r">대변</TableHead>
                <TableHead className="text-right">차변</TableHead>
                <TableHead className="text-right">대변</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.account_code}>
                  <TableCell className="font-mono text-sm border-r">{row.account_code}</TableCell>
                  <TableCell className="border-r">{row.account_name}</TableCell>
                  <TableCell className="text-right">{row.totalDebit > 0 ? formatKRW(row.totalDebit) : ""}</TableCell>
                  <TableCell className="text-right border-r">{row.totalCredit > 0 ? formatKRW(row.totalCredit) : ""}</TableCell>
                  <TableCell className="text-right">{row.debitBalance > 0 ? formatKRW(row.debitBalance) : ""}</TableCell>
                  <TableCell className="text-right">{row.creditBalance > 0 ? formatKRW(row.creditBalance) : ""}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-gray-100">
                <TableCell colSpan={2} className="text-center border-r">합 계</TableCell>
                <TableCell className="text-right">{formatKRW(grandTotalDebit)}</TableCell>
                <TableCell className="text-right border-r">{formatKRW(grandTotalCredit)}</TableCell>
                <TableCell className="text-right">{formatKRW(grandDebitBalance)}</TableCell>
                <TableCell className="text-right">{formatKRW(grandCreditBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="text-center text-muted-foreground py-8">전표 데이터가 없습니다. 전표를 입력하면 시산표가 생성됩니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
