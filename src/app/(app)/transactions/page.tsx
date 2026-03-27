import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, ArrowLeftRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  const transactions = queryAll<any>(
    `SELECT v.id, v.voucher_no, v.voucher_type as type, v.voucher_date as transaction_date,
            v.description, a.name as account_name,
            COALESCE(SUM(vl.debit_amount), 0) as amount_debit,
            COALESCE(SUM(vl.credit_amount), 0) as amount_credit
     FROM vouchers v
     LEFT JOIN accounts a ON a.id = v.account_id
     LEFT JOIN voucher_lines vl ON vl.voucher_id = v.id
     WHERE v.is_deleted = 0 AND v.is_closing = 0
       AND v.voucher_type IN ('deposit', 'withdrawal', 'transfer')
     GROUP BY v.id
     ORDER BY v.voucher_date DESC, v.created_at DESC LIMIT 100`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">입출금 내역</h2><p className="text-muted-foreground">전체 계좌의 입출금 내역</p></div>
        <Button asChild><Link href="/transactions/new"><Plus className="mr-2 h-4 w-4" />거래 등록</Link></Button>
      </div>
      <Card><CardContent className="pt-6">
        {transactions.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="거래 내역이 없습니다" description="새 거래를 등록하여 시작하세요."
            action={<Button asChild><Link href="/transactions/new"><Plus className="mr-2 h-4 w-4" />첫 거래 등록하기</Link></Button>} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>날짜</TableHead><TableHead>계좌</TableHead><TableHead>적요</TableHead><TableHead>분류</TableHead>
              <TableHead className="text-right">입금</TableHead><TableHead className="text-right">출금</TableHead><TableHead className="text-right">잔액</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {transactions.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{formatDateShort(tx.transaction_date)}</TableCell>
                  <TableCell>{tx.account_name}</TableCell>
                  <TableCell>{tx.description || "-"}</TableCell>
                  <TableCell>{tx.category_name && <Badge variant="outline">{tx.category_name}</Badge>}</TableCell>
                  <TableCell className="text-right text-green-600">{tx.type === "deposit" ? formatKRW(tx.amount_debit) : ""}</TableCell>
                  <TableCell className="text-right text-red-600">{tx.type === "withdrawal" ? formatKRW(tx.amount_credit) : ""}</TableCell>
                  <TableCell className="text-right font-medium">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
