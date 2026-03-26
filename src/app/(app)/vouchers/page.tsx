import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  deposit: "입금", withdrawal: "출금", transfer: "대체",
  sale: "매출", purchase: "매입", general: "일반",
};

const TYPE_COLORS: Record<string, string> = {
  deposit: "default", withdrawal: "destructive", transfer: "secondary",
  sale: "default", purchase: "destructive", general: "outline",
};

export default function VouchersPage() {
  const vouchers = queryAll<any>(
    `SELECT v.*,
      (SELECT SUM(debit_amount) FROM voucher_lines WHERE voucher_id = v.id) as total_debit,
      (SELECT SUM(credit_amount) FROM voucher_lines WHERE voucher_id = v.id) as total_credit,
      (SELECT COUNT(*) FROM voucher_lines WHERE voucher_id = v.id) as line_count
     FROM vouchers v ORDER BY v.voucher_date DESC, v.voucher_no DESC LIMIT 100`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">전표 조회</h2><p className="text-muted-foreground">등록된 전표를 조회합니다</p></div>
        <Button asChild><Link href="/vouchers/new"><Plus className="mr-2 h-4 w-4" />전표 입력</Link></Button>
      </div>

      <Card><CardContent className="pt-6">
        {vouchers.length === 0 ? (
          <EmptyState icon={FileText} title="등록된 전표가 없습니다" description="전표를 입력하여 회계 기록을 시작하세요."
            action={<Button asChild><Link href="/vouchers/new"><Plus className="mr-2 h-4 w-4" />첫 전표 입력하기</Link></Button>} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>전표번호</TableHead><TableHead>유형</TableHead><TableHead>전표일</TableHead>
              <TableHead>적요</TableHead><TableHead className="text-right">차변</TableHead>
              <TableHead className="text-right">대변</TableHead><TableHead>라인</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {vouchers.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.voucher_no}</TableCell>
                  <TableCell><Badge variant={TYPE_COLORS[v.voucher_type] as any}>{TYPE_LABELS[v.voucher_type]}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateShort(v.voucher_date)}</TableCell>
                  <TableCell>{v.description || "-"}</TableCell>
                  <TableCell className="text-right">{formatKRW(v.total_debit || 0)}</TableCell>
                  <TableCell className="text-right">{formatKRW(v.total_credit || 0)}</TableCell>
                  <TableCell className="text-center">{v.line_count}건</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
