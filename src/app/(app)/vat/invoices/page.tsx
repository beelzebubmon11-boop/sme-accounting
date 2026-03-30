import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VatInvoicesPage() {
  const salesInvoices = await queryAll<any>(
    `SELECT s.sale_date, c.name as client_name, s.item_description, s.supply_amount, s.tax_amount, s.total_amount, s.invoice_number
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     WHERE s.is_tax_invoice = 1 AND s.is_deleted = 0
     ORDER BY s.sale_date DESC`
  );

  const purchaseInvoices = await queryAll<any>(
    `SELECT p.purchase_date, c.name as client_name, p.item_description, p.supply_amount, p.tax_amount, p.total_amount, p.invoice_number
     FROM purchases p
     LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.is_tax_invoice = 1 AND p.is_deleted = 0
     ORDER BY p.purchase_date DESC`
  );

  const totalSalesSupply = salesInvoices.reduce((s: number, i: any) => s + i.supply_amount, 0);
  const totalSalesTax = salesInvoices.reduce((s: number, i: any) => s + i.tax_amount, 0);
  const totalPurchaseSupply = purchaseInvoices.reduce((s: number, i: any) => s + i.supply_amount, 0);
  const totalPurchaseTax = purchaseInvoices.reduce((s: number, i: any) => s + i.tax_amount, 0);

  function InvoiceTable({ invoices, dateField }: { invoices: any[]; dateField: string }) {
    if (invoices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">세금계산서가 없습니다.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>거래처</TableHead>
            <TableHead>품목</TableHead>
            <TableHead className="text-right">공급가액</TableHead>
            <TableHead className="text-right">세액</TableHead>
            <TableHead className="text-right">합계</TableHead>
            <TableHead>계산서번호</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell className="whitespace-nowrap">
                {formatDateShort(inv[dateField])}
              </TableCell>
              <TableCell>{inv.client_name || "-"}</TableCell>
              <TableCell>{inv.item_description}</TableCell>
              <TableCell className="text-right">{formatKRW(inv.supply_amount)}</TableCell>
              <TableCell className="text-right">{formatKRW(inv.tax_amount)}</TableCell>
              <TableCell className="text-right font-medium">{formatKRW(inv.total_amount)}</TableCell>
              <TableCell>
                {inv.invoice_number ? (
                  <Badge variant="outline">{inv.invoice_number}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">세금계산서 현황</h2>
        <p className="text-muted-foreground">
          매출/매입 세금계산서 발행 및 수취 현황을 조회합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">매출 세금계산서</div>
            <div className="text-2xl font-bold">{salesInvoices.length}건</div>
            <p className="text-sm text-muted-foreground">
              공급가액 {formatKRW(totalSalesSupply)} / 세액 {formatKRW(totalSalesTax)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">매입 세금계산서</div>
            <div className="text-2xl font-bold">{purchaseInvoices.length}건</div>
            <p className="text-sm text-muted-foreground">
              공급가액 {formatKRW(totalPurchaseSupply)} / 세액 {formatKRW(totalPurchaseTax)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>매출 세금계산서</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceTable invoices={salesInvoices} dateField="sale_date" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>매입 세금계산서</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceTable invoices={purchaseInvoices} dateField="purchase_date" />
        </CardContent>
      </Card>
    </div>
  );
}
