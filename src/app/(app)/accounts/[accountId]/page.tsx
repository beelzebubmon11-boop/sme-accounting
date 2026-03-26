import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne, queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;

  const account = queryOne<any>("SELECT * FROM accounts WHERE id = ?", accountId);
  if (!account) notFound();

  const transactions = queryAll<any>(
    `SELECT t.*, c.name as category_name FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.account_id = ? ORDER BY t.transaction_date DESC LIMIT 50`, accountId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/accounts"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{account.name}</h2>
          <p className="text-muted-foreground">{account.bank_name}{account.account_number && ` · ${account.account_number}`}</p>
        </div>
        <Button asChild><Link href={`/transactions/new?account_id=${accountId}`}><Plus className="mr-2 h-4 w-4" />거래 추가</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>현재 잔액</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{formatKRW(account.current_balance)}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>거래 내역</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">거래 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead><TableHead>적요</TableHead><TableHead>분류</TableHead>
                  <TableHead className="text-right">입금</TableHead><TableHead className="text-right">출금</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{formatDateShort(tx.transaction_date)}</TableCell>
                    <TableCell>{tx.description || "-"}</TableCell>
                    <TableCell>{tx.category_name && <Badge variant="outline">{tx.category_name}</Badge>}</TableCell>
                    <TableCell className="text-right text-green-600">{tx.type === "deposit" ? formatKRW(tx.amount) : ""}</TableCell>
                    <TableCell className="text-right text-red-600">{tx.type === "withdrawal" ? formatKRW(tx.amount) : ""}</TableCell>
                    <TableCell className="text-right font-medium">{formatKRW(tx.balance_after)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
