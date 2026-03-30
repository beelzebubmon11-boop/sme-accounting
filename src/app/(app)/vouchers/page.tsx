import Link from "next/link";
import { queryAll, queryOne } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  deposit: "입금", withdrawal: "출금", transfer: "대체",
  sale: "매출", purchase: "매입", general: "일반",
};

const TYPE_COLORS: Record<string, string> = {
  deposit: "default", withdrawal: "destructive", transfer: "secondary",
  sale: "default", purchase: "destructive", general: "outline",
};

const PAGE_SIZE = 50;

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>;
}) {
  // Next.js 16 uses async searchParams - but for server components we access directly
  // We'll use a sync approach with default values
  const params = searchParams as unknown as { page?: string; type?: string; q?: string };
  const page = Math.max(1, parseInt(params?.page || "1") || 1);
  const typeFilter = params?.type || "";
  const searchQuery = params?.q || "";
  const offset = (page - 1) * PAGE_SIZE;

  // Build dynamic query
  const conditions: string[] = ["v.is_deleted = 0"];
  const queryParams: any[] = [];

  if (typeFilter) {
    conditions.push("v.voucher_type = ?");
    queryParams.push(typeFilter);
  }
  if (searchQuery) {
    conditions.push("(v.description LIKE ? OR v.voucher_no LIKE ?)");
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  const whereClause = conditions.join(" AND ");

  const totalCount = (await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM vouchers v WHERE ${whereClause}`,
    ...queryParams
  ))?.cnt || 0;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const vouchers = await queryAll<any>(
    `SELECT v.*,
      (SELECT SUM(debit_amount) FROM voucher_lines WHERE voucher_id = v.id) as total_debit,
      (SELECT SUM(credit_amount) FROM voucher_lines WHERE voucher_id = v.id) as total_credit,
      (SELECT COUNT(*) FROM voucher_lines WHERE voucher_id = v.id) as line_count
     FROM vouchers v WHERE ${whereClause}
     ORDER BY v.voucher_date DESC, v.voucher_no DESC
     LIMIT ? OFFSET ?`,
    ...queryParams, PAGE_SIZE, offset
  );

  function buildUrl(newPage: number) {
    const p = new URLSearchParams();
    if (newPage > 1) p.set("page", String(newPage));
    if (typeFilter) p.set("type", typeFilter);
    if (searchQuery) p.set("q", searchQuery);
    const qs = p.toString();
    return `/vouchers${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">전표 조회</h2><p className="text-muted-foreground">등록된 전표를 조회합니다 (총 {totalCount}건)</p></div>
        <Button asChild><Link href="/vouchers/new"><Plus className="mr-2 h-4 w-4" />전표 입력</Link></Button>
      </div>

      {/* Filters */}
      <Card><CardContent className="pt-6">
        <form className="flex gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">전표유형</label>
            <select name="type" defaultValue={typeFilter} className="h-9 rounded-md border px-3 text-sm bg-white">
              <option value="">전체</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-sm font-medium">검색</label>
            <input name="q" defaultValue={searchQuery} placeholder="전표번호 또는 적요 검색" className="h-9 w-full rounded-md border px-3 text-sm" />
          </div>
          <Button type="submit" variant="secondary" size="sm">조회</Button>
        </form>
      </CardContent></Card>

      <Card><CardContent className="pt-6">
        {vouchers.length === 0 ? (
          <EmptyState icon={FileText} title="등록된 전표가 없습니다" description="전표를 입력하여 회계 기록을 시작하세요."
            action={<Button asChild><Link href="/vouchers/new"><Plus className="mr-2 h-4 w-4" />첫 전표 입력하기</Link></Button>} />
        ) : (
          <>
            <Table>
              <TableHeader><TableRow>
                <TableHead>전표번호</TableHead><TableHead>유형</TableHead><TableHead>전표일</TableHead>
                <TableHead>적요</TableHead><TableHead className="text-right">차변</TableHead>
                <TableHead className="text-right">대변</TableHead><TableHead>라인</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {vouchers.map((v: any) => (
                  <TableRow key={v.id} className={v.is_reversal ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-sm">
                      {v.voucher_no}
                      {v.is_reversal === 1 && <span className="ml-1 text-xs text-orange-500">[역]</span>}
                      {v.is_closing === 1 && <span className="ml-1 text-xs text-blue-500">[결]</span>}
                    </TableCell>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {offset + 1}~{Math.min(offset + PAGE_SIZE, totalCount)} / {totalCount}건
                </p>
                <div className="flex gap-1">
                  {page > 1 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(page - 1)}><ChevronLeft className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = startPage + i;
                    if (p > totalPages) return null;
                    return (
                      <Button key={p} variant={p === page ? "default" : "outline"} size="sm" asChild={p !== page}>
                        {p === page ? <span>{p}</span> : <Link href={buildUrl(p)}>{p}</Link>}
                      </Button>
                    );
                  })}
                  {page < totalPages && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(page + 1)}><ChevronRight className="h-4 w-4" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
