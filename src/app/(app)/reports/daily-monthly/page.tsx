import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function DailyMonthlyPage() {
  const yr = new Date().getFullYear();
  const startDate = `${yr}-01-01`;
  const endDate = `${yr}-12-31`;
  const monthly = await queryAll<any>(`SELECT strftime('%Y-%m',v.voucher_date) as m, SUM(vl.debit_amount) as d, SUM(vl.credit_amount) as c FROM voucher_lines vl JOIN vouchers v ON v.id=vl.voucher_id AND v.is_deleted = 0 WHERE v.voucher_date >= ? AND v.voucher_date <= ? GROUP BY m ORDER BY m`, startDate, endDate);
  const daily = await queryAll<any>(`SELECT v.voucher_date as day, SUM(vl.debit_amount) as d, SUM(vl.credit_amount) as c, COUNT(DISTINCT v.id) as cnt FROM voucher_lines vl JOIN vouchers v ON v.id=vl.voucher_id AND v.is_deleted = 0 WHERE v.voucher_date >= ? AND v.voucher_date <= ? GROUP BY v.voucher_date ORDER BY v.voucher_date DESC LIMIT 60`, startDate, endDate);
  const mTD = monthly.reduce((s: number,r: any)=>s+r.d,0); const mTC = monthly.reduce((s: number,r: any)=>s+r.c,0);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">일/월계표</h2><p className="text-muted-foreground">{yr}년 일별/월별 차변/대변 합계</p></div>
      <Tabs defaultValue="monthly"><TabsList><TabsTrigger value="monthly">월계표</TabsTrigger><TabsTrigger value="daily">일계표</TabsTrigger></TabsList>
        <TabsContent value="monthly"><Card><CardContent className="pt-6">
          {monthly.length===0?<p className="text-center text-muted-foreground py-8">데이터 없음</p>:(
            <Table><TableHeader><TableRow><TableHead>월</TableHead><TableHead className="text-right">차변</TableHead><TableHead className="text-right">대변</TableHead><TableHead className="text-right">차액</TableHead></TableRow></TableHeader>
            <TableBody>{monthly.map((r: any)=>(<TableRow key={r.m}><TableCell className="font-medium">{r.m}</TableCell><TableCell className="text-right">{formatKRW(r.d)}</TableCell><TableCell className="text-right">{formatKRW(r.c)}</TableCell><TableCell className="text-right">{formatKRW(r.d-r.c)}</TableCell></TableRow>))}
            <TableRow className="font-bold bg-gray-50"><TableCell>합계</TableCell><TableCell className="text-right">{formatKRW(mTD)}</TableCell><TableCell className="text-right">{formatKRW(mTC)}</TableCell><TableCell className="text-right">{formatKRW(mTD-mTC)}</TableCell></TableRow></TableBody></Table>)}
        </CardContent></Card></TabsContent>
        <TabsContent value="daily"><Card><CardContent className="pt-6">
          {daily.length===0?<p className="text-center text-muted-foreground py-8">데이터 없음</p>:(
            <Table><TableHeader><TableRow><TableHead>날짜</TableHead><TableHead className="text-right">전표수</TableHead><TableHead className="text-right">차변</TableHead><TableHead className="text-right">대변</TableHead></TableRow></TableHeader>
            <TableBody>{daily.map((r: any)=>(<TableRow key={r.day}><TableCell>{r.day}</TableCell><TableCell className="text-right">{r.cnt}건</TableCell><TableCell className="text-right">{formatKRW(r.d)}</TableCell><TableCell className="text-right">{formatKRW(r.c)}</TableCell></TableRow>))}</TableBody></Table>)}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
