import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PurchasesPage() {
  const purchases = queryAll<any>(
    `SELECT p.*, c.name as client_name FROM purchases p LEFT JOIN clients c ON c.id = p.client_id WHERE p.is_deleted = 0 ORDER BY p.purchase_date DESC LIMIT 100`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">매입 관리</h2><p className="text-muted-foreground">매입 내역을 관리합니다</p></div>
        <Button asChild><Link href="/purchases/new"><Plus className="mr-2 h-4 w-4" />매입 등록</Link></Button>
      </div>
      <Card><CardContent className="pt-6">
        {purchases.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="매입 내역이 없습니다" description="매입을 등록하여 관리를 시작하세요."
            action={<Button asChild><Link href="/purchases/new"><Plus className="mr-2 h-4 w-4" />첫 매입 등록하기</Link></Button>} />
        ) : (
          <Table><TableHeader><TableRow>
            <TableHead>날짜</TableHead><TableHead>거래처</TableHead><TableHead>품목</TableHead>
            <TableHead className="text-right">공급가액</TableHead><TableHead className="text-right">부가세</TableHead><TableHead className="text-right">합계</TableHead>
            <TableHead>세금계산서</TableHead><TableHead>상태</TableHead>
          </TableRow></TableHeader><TableBody>
            {purchases.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{formatDateShort(p.purchase_date)}</TableCell>
                <TableCell>{p.client_name}</TableCell><TableCell>{p.item_description}</TableCell>
                <TableCell className="text-right">{formatKRW(p.supply_amount)}</TableCell>
                <TableCell className="text-right">{formatKRW(p.tax_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatKRW(p.total_amount)}</TableCell>
                <TableCell>{p.is_tax_invoice ? <Badge variant="outline">수취</Badge> : "-"}</TableCell>
                <TableCell><Badge variant={p.status === "paid" ? "default" : p.status === "partial" ? "secondary" : "destructive"}>
                  {p.status === "paid" ? "지급완료" : p.status === "partial" ? "부분지급" : "미지급"}
                </Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        )}
      </CardContent></Card>
    </div>
  );
}
