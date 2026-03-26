"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKRW } from "@/lib/format";
import { FileText } from "lucide-react";

interface VatData {
  taxableSales: number;
  exemptSales: number;
  salesTax: number;
  purchaseTax: number;
  taxPayable: number;
}

const currentYear = new Date().getFullYear();
const periods = [
  { value: "q1p", label: `${currentYear}년 1기 예정 (1~3월)`, startMonth: "01", endMonth: "03" },
  { value: "q1c", label: `${currentYear}년 1기 확정 (4~6월)`, startMonth: "04", endMonth: "06" },
  { value: "q2p", label: `${currentYear}년 2기 예정 (7~9월)`, startMonth: "07", endMonth: "09" },
  { value: "q2c", label: `${currentYear}년 2기 확정 (10~12월)`, startMonth: "10", endMonth: "12" },
];

export default function VatReturnPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("q1p");
  const [vatData, setVatData] = useState<VatData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVatData();
  }, [selectedPeriod]);

  async function loadVatData() {
    setLoading(true);
    const period = periods.find((p) => p.value === selectedPeriod)!;
    const startDate = `${currentYear}-${period.startMonth}-01`;
    const endMonth = period.endMonth;
    const lastDay = new Date(currentYear, parseInt(endMonth), 0).getDate();
    const endDate = `${currentYear}-${endMonth}-${String(lastDay).padStart(2, "0")}`;

    try {
      const res = await fetch(
        `/api/vat/return?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setVatData(data);
    } catch {
      setVatData({
        taxableSales: 0,
        exemptSales: 0,
        salesTax: 0,
        purchaseTax: 0,
        taxPayable: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const period = periods.find((p) => p.value === selectedPeriod)!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">부가세 신고서</h2>
        <p className="text-muted-foreground">
          부가가치세 신고서를 자동 생성하고 신고 내역을 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>신고 기간 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={selectedPeriod}
              onValueChange={(v) => v && setSelectedPeriod(v)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="신고 기간을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center py-12 text-muted-foreground">
            데이터를 불러오는 중...
          </CardContent>
        </Card>
      ) : vatData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              부가가치세 신고서 - {period.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">항목</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">I. 과세 매출 합계 (공급가액)</TableCell>
                  <TableCell className="text-right">
                    {formatKRW(vatData.taxableSales)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">II. 면세 매출 합계 (공급가액)</TableCell>
                  <TableCell className="text-right">
                    {formatKRW(vatData.exemptSales)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">매출 합계</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatKRW(vatData.taxableSales + vatData.exemptSales)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-blue-600">III. 매출세액</TableCell>
                  <TableCell className="text-right text-blue-600 font-semibold">
                    {formatKRW(vatData.salesTax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-green-600">IV. 매입세액</TableCell>
                  <TableCell className="text-right text-green-600 font-semibold">
                    {formatKRW(vatData.purchaseTax)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 text-lg">
                  <TableCell className="font-bold">
                    V. 납부(환급)세액 (매출세액 - 매입세액)
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      vatData.taxPayable >= 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {vatData.taxPayable >= 0
                      ? formatKRW(vatData.taxPayable)
                      : `(${formatKRW(Math.abs(vatData.taxPayable))}) 환급`}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {vatData.taxPayable < 0 && (
              <p className="mt-4 text-sm text-blue-600">
                매입세액이 매출세액보다 많아 환급 대상입니다.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
