import { queryAll, queryOne } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Net income (revenue - expenses)
  const incomeData = await queryOne<any>(`
    SELECT COALESCE(SUM(
      CASE WHEN coa.category = 'revenue' THEN vl.credit_amount - vl.debit_amount
           WHEN coa.category = 'expense' THEN -(vl.debit_amount - vl.credit_amount)
      END
    ), 0) as net_income
    FROM voucher_lines vl
    JOIN vouchers v ON v.id = vl.voucher_id AND v.is_closing = 0 AND v.is_deleted = 0
    JOIN chart_of_accounts coa ON coa.code = vl.account_code
    WHERE coa.category IN ('revenue', 'expense')
    AND v.voucher_date >= ? AND v.voucher_date <= ?
  `, startDate, endDate);
  const netIncome = incomeData?.net_income || 0;

  // Depreciation expense (account 820 debit sum)
  const depData = await queryOne<any>(`
    SELECT COALESCE(SUM(vl.debit_amount), 0) as depreciation
    FROM voucher_lines vl
    JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0
    WHERE vl.account_code = '820'
    AND v.voucher_date >= ? AND v.voucher_date <= ?
  `, startDate, endDate);
  const depreciation = depData?.depreciation || 0;

  // Operating activity changes: accounts receivable, payable, etc.
  async function getAccountChange(code: string): Promise<number> {
    const data = await queryOne<any>(`
      SELECT COALESCE(SUM(vl.debit_amount) - SUM(vl.credit_amount), 0) as net_change
      FROM voucher_lines vl
      JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0
      WHERE vl.account_code = ?
      AND v.voucher_date >= ? AND v.voucher_date <= ?
    `, code, startDate, endDate);
    return data?.net_change || 0;
  }

  // Operating activity items
  const arChange = await getAccountChange("108"); // 외상매출금 increase is cash outflow
  const apChange = await getAccountChange("251"); // 외상매입금 increase is cash inflow
  const receivableChange = await getAccountChange("110"); // 미수금
  const payableChange = await getAccountChange("253"); // 미지급금

  // For liabilities: credit increase = positive change, but net_change is debit-credit
  // So we negate for liability accounts
  const operatingCashFlow =
    netIncome +
    depreciation +
    (-arChange) +     // Increase in AR reduces cash
    (-apChange) +     // Increase in AP (debit-credit is negative) adds cash, so -(-) = +
    (-receivableChange) +
    (-payableChange);

  // Investment activities: fixed asset acquisitions
  const investData = await queryOne<any>(`
    SELECT COALESCE(SUM(vl.debit_amount), 0) as asset_purchases
    FROM voucher_lines vl
    JOIN vouchers v ON v.id = vl.voucher_id AND v.is_deleted = 0
    JOIN chart_of_accounts coa ON coa.code = vl.account_code
    WHERE coa.code IN ('201', '202', '203')
    AND v.voucher_date >= ? AND v.voucher_date <= ?
  `, startDate, endDate);
  const assetPurchases = investData?.asset_purchases || 0;
  const investingCashFlow = -assetPurchases;

  // Financing activities: borrowings and capital
  const borrowingChange = await getAccountChange("280"); // 장기차입금
  const capitalChange = await getAccountChange("331"); // 자본금
  // For liabilities/equity: credit is increase, debit-credit being negative means increase
  const financingCashFlow = (-borrowingChange) + (-capitalChange);

  const totalCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  function LineItem({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
    return (
      <div className={`flex justify-between py-1 text-sm ${indent ? "ml-8" : ""}`}>
        <span>{label}</span>
        <span className={amount >= 0 ? "" : "text-red-600"}>{formatKRW(amount)}</span>
      </div>
    );
  }

  function SectionTotal({ label, amount }: { label: string; amount: number }) {
    return (
      <div className="flex justify-between py-1.5 font-semibold border-t mt-2">
        <span>{label}</span>
        <span className={amount >= 0 ? "" : "text-red-600"}>{formatKRW(amount)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">현금흐름표</h2>
        <p className="text-muted-foreground">
          {currentYear}년 영업/투자/재무 활동별 현금 흐름을 분석하여 조회합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>현금흐름표 (간접법)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <h4 className="font-semibold text-muted-foreground">I. 영업활동 현금흐름</h4>
          <LineItem label="당기순이익" amount={netIncome} indent />
          <p className="text-xs text-muted-foreground ml-8 mt-2">조정항목:</p>
          <LineItem label="(+) 감가상각비" amount={depreciation} indent />
          <p className="text-xs text-muted-foreground ml-8 mt-2">영업활동 자산/부채 변동:</p>
          <LineItem label="외상매출금 변동" amount={-arChange} indent />
          <LineItem label="미수금 변동" amount={-receivableChange} indent />
          <LineItem label="외상매입금 변동" amount={-apChange} indent />
          <LineItem label="미지급금 변동" amount={-payableChange} indent />
          <SectionTotal label="영업활동 현금흐름 소계" amount={operatingCashFlow} />

          <h4 className="font-semibold text-muted-foreground mt-6">II. 투자활동 현금흐름</h4>
          {assetPurchases > 0 && (
            <LineItem label="(-) 고정자산 취득" amount={-assetPurchases} indent />
          )}
          {assetPurchases === 0 && (
            <p className="text-sm text-muted-foreground ml-8 py-1">투자활동 내역 없음</p>
          )}
          <SectionTotal label="투자활동 현금흐름 소계" amount={investingCashFlow} />

          <h4 className="font-semibold text-muted-foreground mt-6">III. 재무활동 현금흐름</h4>
          {borrowingChange !== 0 && (
            <LineItem label="장기차입금 변동" amount={-borrowingChange} indent />
          )}
          {capitalChange !== 0 && (
            <LineItem label="자본금 변동" amount={-capitalChange} indent />
          )}
          {borrowingChange === 0 && capitalChange === 0 && (
            <p className="text-sm text-muted-foreground ml-8 py-1">재무활동 내역 없음</p>
          )}
          <SectionTotal label="재무활동 현금흐름 소계" amount={financingCashFlow} />

          <div className="flex justify-between py-2 font-bold text-lg border-t border-b mt-4">
            <span>현금 증감 합계</span>
            <span className={totalCashFlow >= 0 ? "" : "text-red-600"}>
              {formatKRW(totalCashFlow)}
            </span>
          </div>

          {netIncome === 0 && depreciation === 0 && assetPurchases === 0 && (
            <p className="text-center text-muted-foreground py-4 mt-4">
              전표 데이터가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
