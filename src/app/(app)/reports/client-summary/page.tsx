import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default function ClientSummaryPage() {
  const data = queryAll<any>(`
    SELECT c.name, COALESCE(SUM(vl.debit_amount),0) as td, COALESCE(SUM(vl.credit_amount),0) as tc
    FROM clients c LEFT JOIN voucher_lines vl ON vl.client_id=c.id LEFT JOIN vouchers v ON v.id=vl.voucher_id
    WHERE c.is_active=1 GROUP BY c.id,c.name HAVING td>0 OR tc>0 ORDER BY c.name
  `);
  const totD = data.reduce((s: number, r: any) => s + r.td, 0);
  const totC = data.reduce((s: number, r: any) => s + r.tc, 0);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">거래처별 합계표</h2><p className="text-muted-foreground">모든 거래처 차변/대변 합계</p></div>
      <Card><CardContent className="pt-6">
        {data.length === 0 ? <p className="text-center text-muted-foreground py-8">데이터 없음</p> : (
          <Table><TableHeader><TableRow><TableHead>거래처명</TableHead><TableHead className="text-right">차변</TableHead><TableHead className="text-right">대변</TableHead><TableHead className="text-right">잔액</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((r: any) => (<TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-right">{formatKRW(r.td)}</TableCell><TableCell className="text-right">{formatKRW(r.tc)}</TableCell><TableCell className="text-right font-medium">{formatKRW(r.td-r.tc)}</TableCell></TableRow>))}
          <TableRow className="font-bold bg-gray-50"><TableCell>합계</TableCell><TableCell className="text-right">{formatKRW(totD)}</TableCell><TableCell className="text-right">{formatKRW(totC)}</TableCell><TableCell className="text-right">{formatKRW(totD-totC)}</TableCell></TableRow>
          </TableBody></Table>)}
      </CardContent></Card>
    </div>
  );
}
