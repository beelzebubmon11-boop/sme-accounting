import { queryAll } from "@/lib/db/client";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AssetLedgerPage() {
  const assets = queryAll<any>(
    `SELECT * FROM fixed_assets ORDER BY acquisition_date DESC`
  );

  const totalAcquisition = assets.reduce((s: number, a: any) => s + a.acquisition_cost, 0);
  const totalAccum = assets.reduce((s: number, a: any) => s + a.accumulated_depreciation, 0);
  const totalBook = assets.reduce((s: number, a: any) => s + a.book_value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">자산 대장</h2>
        <p className="text-muted-foreground">
          등록된 고정자산의 취득/상각/처분 이력을 대장 형태로 조회합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">총 취득원가</div>
            <div className="text-2xl font-bold">{formatKRW(totalAcquisition)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">감가상각누계액</div>
            <div className="text-2xl font-bold">{formatKRW(totalAccum)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">총 장부가액</div>
            <div className="text-2xl font-bold">{formatKRW(totalBook)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            자산 대장
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">등록된 자산이 없습니다</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                고정자산을 먼저 등록하세요.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산명</TableHead>
                  <TableHead>계정</TableHead>
                  <TableHead>취득일</TableHead>
                  <TableHead className="text-right">취득원가</TableHead>
                  <TableHead>내용연수</TableHead>
                  <TableHead>상각방법</TableHead>
                  <TableHead className="text-right">감가상각누계액</TableHead>
                  <TableHead className="text-right">장부가액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset: any) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      {asset.account_code} {asset.account_name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateShort(asset.acquisition_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(asset.acquisition_cost)}
                    </TableCell>
                    <TableCell>{asset.useful_life}년</TableCell>
                    <TableCell>
                      {asset.depreciation_method === "straight" ? "정액법" : "정률법"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(asset.accumulated_depreciation)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatKRW(asset.book_value)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={asset.status === "active" ? "default" : "secondary"}
                      >
                        {asset.status === "active" ? "사용중" : "처분"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>합계</TableCell>
                  <TableCell className="text-right">{formatKRW(totalAcquisition)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                  <TableCell className="text-right">{formatKRW(totalAccum)}</TableCell>
                  <TableCell className="text-right">{formatKRW(totalBook)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
