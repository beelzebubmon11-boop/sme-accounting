import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BalanceSheetPage() {
  const balances = await queryAll<{ code: string; name: string; category: string; sub_category: string; balance: number }>(`
    SELECT coa.code, coa.name, coa.category, COALESCE(coa.sub_category,'') as sub_category,
      CASE WHEN coa.category = 'asset'
           THEN COALESCE(SUM(vl.debit_amount),0) - COALESCE(SUM(vl.credit_amount),0)
           ELSE COALESCE(SUM(vl.credit_amount),0) - COALESCE(SUM(vl.debit_amount),0)
      END as balance
    FROM chart_of_accounts coa
    LEFT JOIN voucher_lines vl ON vl.account_code = coa.code
    LEFT JOIN vouchers v ON v.id = vl.voucher_id AND v.is_closing = 0 AND v.is_deleted = 0
    WHERE coa.is_active = 1 AND coa.category IN ('asset','liability','equity')
    GROUP BY coa.code, coa.name, coa.category, coa.sub_category
    HAVING balance != 0
    ORDER BY coa.code
  `);

  // Calculate net income from revenue/expense (excluding closing entries)
  const netIncome = (await queryAll<{ balance: number }>(`
    SELECT COALESCE(SUM(CASE WHEN coa.category='revenue' THEN vl.credit_amount - vl.debit_amount
                              WHEN coa.category='expense' THEN -(vl.debit_amount - vl.credit_amount) END),0) as balance
    FROM voucher_lines vl
    JOIN vouchers v ON v.id = vl.voucher_id AND v.is_closing = 0 AND v.is_deleted = 0
    JOIN chart_of_accounts coa ON coa.code = vl.account_code
    WHERE coa.category IN ('revenue','expense')
  `))[0]?.balance || 0;

  const assets = balances.filter(b => b.category === 'asset');
  const liabilities = balances.filter(b => b.category === 'liability');
  const equities = balances.filter(b => b.category === 'equity');

  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
  const totalEquity = equities.reduce((s, b) => s + b.balance, 0) + netIncome;

  function Section({ title, items, total }: { title: string; items: typeof balances; total: number }) {
    const groups = new Map<string, typeof balances>();
    items.forEach(i => { const g = groups.get(i.sub_category) || []; g.push(i); groups.set(i.sub_category, g); });
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-bold border-b pb-1">{title}</h3>
        {Array.from(groups).map(([sub, items]) => (
          <div key={sub} className="ml-4">
            {sub && <p className="text-sm font-semibold text-muted-foreground mt-2">{sub}</p>}
            {items.map(i => (
              <div key={i.code} className="flex justify-between py-0.5 text-sm">
                <span>{i.code} {i.name}</span>
                <span>{formatKRW(i.balance)}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="flex justify-between font-bold border-t pt-1 mt-2">
          <span>{title} 합계</span><span>{formatKRW(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">재무상태표</h2><p className="text-muted-foreground">자산 = 부채 + 자본</p></div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>자산</CardTitle></CardHeader>
          <CardContent><Section title="자산" items={assets} total={totalAssets} /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>부채</CardTitle></CardHeader>
            <CardContent><Section title="부채" items={liabilities} total={totalLiabilities} /></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>자본</CardTitle></CardHeader>
            <CardContent>
              <Section title="자본" items={equities} total={totalEquity - netIncome} />
              {netIncome !== 0 && (
                <div className="flex justify-between py-0.5 text-sm ml-4"><span>당기순이익</span><span>{formatKRW(netIncome)}</span></div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 mt-2"><span>자본 합계</span><span>{formatKRW(totalEquity)}</span></div>
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6">
            <div className="flex justify-between font-bold text-lg">
              <span>부채 + 자본 합계</span><span>{formatKRW(totalLiabilities + totalEquity)}</span>
            </div>
            {totalAssets !== totalLiabilities + totalEquity && (
              <p className="text-red-600 text-sm mt-2">대차가 일치하지 않습니다. 차액: {formatKRW(Math.abs(totalAssets - totalLiabilities - totalEquity))}</p>
            )}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
