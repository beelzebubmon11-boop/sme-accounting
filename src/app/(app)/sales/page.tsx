import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, TrendingUp, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await queryAll<any>(
    `SELECT s.*, c.name as client_name FROM sales s LEFT JOIN clients c ON c.id = s.client_id WHERE s.is_deleted = 0 ORDER BY s.sale_date DESC LIMIT 100`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">매출 관리</h2><p className="text-muted-foreground">매출 내역을 관리합니다</p></div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/sales/reports"><BarChart3 className="mr-2 h-4 w-4" />보고서</Link></Button>
          <Button asChild><Link href="/sales/new"><Plus className="mr-2 h-4 w-4" />매출 등록</Link></Button>
        </div>
      </div>
      <Card><CardContent className="pt-6">
        {sales.length === 0 ? (
          <EmptyState icon={TrendingUp} title="매출 내역이 없습니다" description="매출을 등록하여 관리를 시작하세요."
            action={<Button asChild><Link href="/sales/new"><Plus className="mr-2 h-4 w-4" />첫 매출 등록하기</Link></Button>} />
        ) : (
          <Table><TableHeader><TableRow>
            <TableHead>날짜</TableHead><TableHead>거래처</TableHead><TableHead>품목</TableHead>
            <TableHead className="text-right">공급가액</TableHead><TableHead className="text-right">부가세</TableHead><TableHead className="text-right">합계</TableHead>
            <TableHead>세금계산서</TableHead><TableHead>상태</TableHead>
          </TableRow></TableHeader><TableBody>
            {sales.map((sale: any) => (
              <TableRow key={sale.id}>
                <TableCell className="whitespace-nowrap">{formatDateShort(sale.sale_date)}</TableCell>
                <TableCell>{sale.client_name}</TableCell><TableCell>{sale.item_description}</TableCell>
                <TableCell className="text-right">{formatKRW(sale.supply_amount)}</TableCell>
                <TableCell className="text-right">{formatKRW(sale.tax_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatKRW(sale.total_amount)}</TableCell>
                <TableCell>{sale.is_tax_invoice ? <Badge variant="outline">발행</Badge> : "-"}</TableCell>
                <TableCell><Badge variant={sale.status === "paid" ? "default" : sale.status === "partial" ? "secondary" : "destructive"}>
                  {sale.status === "paid" ? "수금완료" : sale.status === "partial" ? "부분수금" : "미수금"}
                </Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        )}
      </CardContent></Card>
    </div>
  );
}
