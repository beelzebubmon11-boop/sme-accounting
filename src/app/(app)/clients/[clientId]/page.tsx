import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne, queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = queryOne<any>("SELECT * FROM clients WHERE id = ?", clientId);
  if (!client) notFound();

  const sales = queryAll<any>("SELECT * FROM sales WHERE client_id = ? AND is_deleted = 0 ORDER BY sale_date DESC LIMIT 20", clientId);
  const purchases = queryAll<any>("SELECT * FROM purchases WHERE client_id = ? AND is_deleted = 0 ORDER BY purchase_date DESC LIMIT 20", clientId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/clients"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div><h2 className="text-2xl font-bold">{client.name}</h2><p className="text-muted-foreground">{client.business_number || "사업자번호 미등록"}</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>거래처 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">대표자</span><span>{client.representative_name || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">연락처</span><span>{client.contact_phone || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">이메일</span><span>{client.contact_email || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">주소</span><span>{client.address || "-"}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>거래 요약</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">총 매출</span><span className="font-medium text-green-600">{formatKRW(sales.reduce((s: number, r: any) => s + r.total_amount, 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">총 매입</span><span className="font-medium text-red-600">{formatKRW(purchases.reduce((s: number, r: any) => s + r.total_amount, 0))}</span></div>
          </CardContent>
        </Card>
      </div>

      {sales.length > 0 && (
        <Card><CardHeader><CardTitle>매출 내역</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow>
            <TableHead>날짜</TableHead><TableHead>품목</TableHead><TableHead className="text-right">공급가액</TableHead><TableHead className="text-right">부가세</TableHead><TableHead className="text-right">합계</TableHead><TableHead>상태</TableHead>
          </TableRow></TableHeader><TableBody>
            {sales.map((sale: any) => (
              <TableRow key={sale.id}>
                <TableCell>{formatDateShort(sale.sale_date)}</TableCell><TableCell>{sale.item_description}</TableCell>
                <TableCell className="text-right">{formatKRW(sale.supply_amount)}</TableCell><TableCell className="text-right">{formatKRW(sale.tax_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatKRW(sale.total_amount)}</TableCell>
                <TableCell><Badge variant={sale.status === "paid" ? "default" : "destructive"}>{sale.status === "paid" ? "수금완료" : sale.status === "partial" ? "부분수금" : "미수금"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      )}

      {purchases.length > 0 && (
        <Card><CardHeader><CardTitle>매입 내역</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow>
            <TableHead>날짜</TableHead><TableHead>품목</TableHead><TableHead className="text-right">공급가액</TableHead><TableHead className="text-right">부가세</TableHead><TableHead className="text-right">합계</TableHead><TableHead>상태</TableHead>
          </TableRow></TableHeader><TableBody>
            {purchases.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{formatDateShort(p.purchase_date)}</TableCell><TableCell>{p.item_description}</TableCell>
                <TableCell className="text-right">{formatKRW(p.supply_amount)}</TableCell><TableCell className="text-right">{formatKRW(p.tax_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatKRW(p.total_amount)}</TableCell>
                <TableCell><Badge variant={p.status === "paid" ? "default" : "destructive"}>{p.status === "paid" ? "지급완료" : p.status === "partial" ? "부분지급" : "미지급"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </CardContent></Card>
      )}
    </div>
  );
}
