import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function IncomeStatementPage() {
  const items = queryAll<{ code: string; name: string; sub_category: string; amount: number }>(`
    SELECT coa.code, coa.name, COALESCE(coa.sub_category,'') as sub_category,
      CASE WHEN coa.category='revenue' THEN COALESCE(SUM(vl.credit_amount)-SUM(vl.debit_amount),0)
           WHEN coa.category='expense' THEN COALESCE(SUM(vl.debit_amount)-SUM(vl.credit_amount),0)
      END as amount
    FROM chart_of_accounts coa
    LEFT JOIN voucher_lines vl ON vl.account_code = coa.code
    LEFT JOIN vouchers v ON v.id = vl.voucher_id AND v.is_closing = 0 AND v.is_deleted = 0
    WHERE coa.category IN ('revenue','expense') AND coa.is_active = 1
    GROUP BY coa.code, coa.name, coa.category, coa.sub_category
    HAVING amount != 0
    ORDER BY coa.code
  `);

  const revenue = items.filter(i => i.sub_category === '매출');
  const cogs = items.filter(i => i.sub_category === '매출원가');
  const sga = items.filter(i => i.sub_category === '판매비와관리비');
  const otherIncome = items.filter(i => i.sub_category === '영업외수익');
  const otherExpense = items.filter(i => i.sub_category === '영업외비용');

  const totalRevenue = revenue.reduce((s, i) => s + i.amount, 0);
  const totalCogs = cogs.reduce((s, i) => s + i.amount, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalSga = sga.reduce((s, i) => s + i.amount, 0);
  const operatingIncome = grossProfit - totalSga;
  const totalOtherIncome = otherIncome.reduce((s, i) => s + i.amount, 0);
  const totalOtherExpense = otherExpense.reduce((s, i) => s + i.amount, 0);
  const netIncome = operatingIncome + totalOtherIncome - totalOtherExpense;

  function LineItems({ items: rows }: { items: typeof items }) {
    return (<>{rows.map(i => (
      <div key={i.code} className="flex justify-between py-0.5 text-sm ml-8">
        <span>{i.code} {i.name}</span><span>{formatKRW(i.amount)}</span>
      </div>
    ))}</>);
  }

  function SubTotal({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
    return (
      <div className={`flex justify-between py-1 ${bold ? "font-bold text-lg border-t border-b my-2" : "font-semibold border-t mt-1"}`}>
        <span>{label}</span><span className={amount >= 0 ? "" : "text-red-600"}>{formatKRW(amount)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">손익계산서</h2><p className="text-muted-foreground">매출 → 매출총이익 → 영업이익 → 당기순이익</p></div>
      <Card><CardHeader><CardTitle>손익계산서</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <h4 className="font-semibold text-muted-foreground">I. 매출</h4>
          <LineItems items={revenue} />
          <SubTotal label="매출 합계" amount={totalRevenue} />

          <h4 className="font-semibold text-muted-foreground mt-4">II. 매출원가</h4>
          <LineItems items={cogs} />
          <SubTotal label="매출원가 합계" amount={totalCogs} />
          <SubTotal label="매출총이익" amount={grossProfit} />

          <h4 className="font-semibold text-muted-foreground mt-4">III. 판매비와관리비</h4>
          <LineItems items={sga} />
          <SubTotal label="판매비와관리비 합계" amount={totalSga} />
          <SubTotal label="영업이익" amount={operatingIncome} />

          {(otherIncome.length > 0 || otherExpense.length > 0) && (
            <>
              {otherIncome.length > 0 && (<><h4 className="font-semibold text-muted-foreground mt-4">IV. 영업외수익</h4><LineItems items={otherIncome} /></>)}
              {otherExpense.length > 0 && (<><h4 className="font-semibold text-muted-foreground mt-4">V. 영업외비용</h4><LineItems items={otherExpense} /></>)}
            </>
          )}

          <SubTotal label="당기순이익" amount={netIncome} bold />
          {items.length === 0 && <p className="text-center text-muted-foreground py-8">전표 데이터가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
