import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default function CashBookPage() {
  const entries = queryAll<any>(`
    SELECT v.voucher_date,v.voucher_no,v.description,vl.debit_amount,vl.credit_amount,
      (SELECT account_name FROM voucher_lines WHERE voucher_id=vl.voucher_id AND id!=vl.id LIMIT 1) as counterpart
    FROM voucher_lines vl JOIN vouchers v ON v.id=vl.voucher_id AND v.is_deleted = 0
    WHERE vl.account_code IN ('101','103') ORDER BY v.voucher_date,v.voucher_no LIMIT 200
  `);
  let bal = 0;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">현금출납장</h2><p className="text-muted-foreground">현금/보통예금 입출금 내역</p></div>
      <Card><CardContent className="pt-6">
        {entries.length===0?<p className="text-center text-muted-foreground py-8">데이터 없음</p>:(
          <Table><TableHeader><TableRow><TableHead>날짜</TableHead><TableHead>전표번호</TableHead><TableHead>적요</TableHead><TableHead>상대계정</TableHead><TableHead className="text-right">입금</TableHead><TableHead className="text-right">출금</TableHead><TableHead className="text-right">잔액</TableHead></TableRow></TableHeader>
          <TableBody>{entries.map((e: any,i: number)=>{bal+=e.debit_amount-e.credit_amount;return(
            <TableRow key={i}><TableCell className="whitespace-nowrap">{formatDateShort(e.voucher_date)}</TableCell><TableCell className="font-mono text-xs">{e.voucher_no}</TableCell><TableCell>{e.description||"-"}</TableCell><TableCell className="text-sm">{e.counterpart||"-"}</TableCell>
            <TableCell className="text-right text-green-600">{e.debit_amount>0?formatKRW(e.debit_amount):""}</TableCell><TableCell className="text-right text-red-600">{e.credit_amount>0?formatKRW(e.credit_amount):""}</TableCell><TableCell className="text-right font-medium">{formatKRW(bal)}</TableCell></TableRow>);})}</TableBody></Table>)}
      </CardContent></Card>
    </div>
  );
}
