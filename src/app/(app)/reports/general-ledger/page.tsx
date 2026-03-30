import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function GeneralLedgerPage() {
  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);
  const startDate = `${yearStr}-01-01`;
  const endDate = `${yearStr}-12-31`;
  const data = await queryAll<any>(`
    SELECT coa.code, coa.name,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='01' THEN vl.debit_amount END),0) as m1d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='01' THEN vl.credit_amount END),0) as m1c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='02' THEN vl.debit_amount END),0) as m2d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='02' THEN vl.credit_amount END),0) as m2c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='03' THEN vl.debit_amount END),0) as m3d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='03' THEN vl.credit_amount END),0) as m3c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='04' THEN vl.debit_amount END),0) as m4d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='04' THEN vl.credit_amount END),0) as m4c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='05' THEN vl.debit_amount END),0) as m5d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='05' THEN vl.credit_amount END),0) as m5c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='06' THEN vl.debit_amount END),0) as m6d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='06' THEN vl.credit_amount END),0) as m6c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='07' THEN vl.debit_amount END),0) as m7d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='07' THEN vl.credit_amount END),0) as m7c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='08' THEN vl.debit_amount END),0) as m8d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='08' THEN vl.credit_amount END),0) as m8c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='09' THEN vl.debit_amount END),0) as m9d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='09' THEN vl.credit_amount END),0) as m9c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='10' THEN vl.debit_amount END),0) as m10d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='10' THEN vl.credit_amount END),0) as m10c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='11' THEN vl.debit_amount END),0) as m11d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='11' THEN vl.credit_amount END),0) as m11c,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='12' THEN vl.debit_amount END),0) as m12d,
      COALESCE(SUM(CASE WHEN strftime('%m',v.voucher_date)='12' THEN vl.credit_amount END),0) as m12c
    FROM chart_of_accounts coa
    LEFT JOIN voucher_lines vl ON vl.account_code = coa.code
    LEFT JOIN vouchers v ON v.id = vl.voucher_id AND v.voucher_date >= ? AND v.voucher_date <= ? AND v.is_deleted = 0
    WHERE coa.is_active = 1
    GROUP BY coa.code, coa.name
    HAVING m1d>0 OR m1c>0 OR m2d>0 OR m2c>0 OR m3d>0 OR m3c>0 OR m4d>0 OR m4c>0 OR m5d>0 OR m5c>0 OR m6d>0 OR m6c>0 OR m7d>0 OR m7c>0 OR m8d>0 OR m8c>0 OR m9d>0 OR m9c>0 OR m10d>0 OR m10c>0 OR m11d>0 OR m11c>0 OR m12d>0 OR m12c>0
    ORDER BY coa.code
  `, startDate, endDate);

  const months = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">총계정원장</h2><p className="text-muted-foreground">{currentYear}년 전체 계정 월별 증감</p></div>
      <Card><CardContent className="pt-6 overflow-x-auto">
        {data.length === 0 ? <p className="text-center text-muted-foreground py-8">데이터 없음</p> : (
          <Table><TableHeader><TableRow>
            <TableHead className="sticky left-0 bg-white z-10">코드</TableHead>
            <TableHead className="sticky left-14 bg-white z-10">계정</TableHead>
            {months.map(m => <TableHead key={m} className="text-center text-xs min-w-20">{m}</TableHead>)}
            <TableHead className="text-right">합계</TableHead>
          </TableRow></TableHeader><TableBody>
            {data.map((row: any) => {
              let totalD = 0, totalC = 0;
              return (
                <TableRow key={row.code}>
                  <TableCell className="font-mono text-xs sticky left-0 bg-white">{row.code}</TableCell>
                  <TableCell className="text-xs sticky left-14 bg-white">{row.name}</TableCell>
                  {Array.from({length:12},(_,i)=>{
                    const d = row[`m${i+1}d`]||0; const c = row[`m${i+1}c`]||0;
                    totalD += d; totalC += c;
                    const net = d - c;
                    return <TableCell key={i} className={`text-xs text-right ${net > 0 ? "text-blue-600" : net < 0 ? "text-red-600" : ""}`}>
                      {net !== 0 ? formatKRW(net) : "-"}
                    </TableCell>;
                  })}
                  <TableCell className="text-right text-xs font-medium">{formatKRW(totalD - totalC)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody></Table>
        )}
      </CardContent></Card>
    </div>
  );
}
