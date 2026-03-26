"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKRW } from "@/lib/format";
import { Calculator, FileDown } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  account_code: string;
  account_name: string;
  acquisition_cost: number;
  useful_life: number;
  depreciation_method: string;
  salvage_value: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface DepreciationRow extends Asset {
  monthlyDepreciation: number;
}

function calcMonthlyDepreciation(asset: Asset): number {
  if (asset.status !== "active") return 0;
  if (asset.book_value <= asset.salvage_value) return 0;

  if (asset.depreciation_method === "straight") {
    return Math.round(
      (asset.acquisition_cost - asset.salvage_value) / asset.useful_life / 12
    );
  } else {
    // Declining balance
    const rate = 1 - Math.pow(asset.salvage_value / asset.acquisition_cost, 1 / asset.useful_life);
    const annual = Math.round(asset.book_value * rate);
    return Math.round(annual / 12);
  }
}

function getAccumAccountCode(assetCode: string): { code: string; name: string } {
  const mapping: Record<string, { code: string; name: string }> = {
    "201": { code: "210", name: "건물감가상각누계액" },
    "202": { code: "211", name: "차량감가상각누계액" },
    "203": { code: "212", name: "비품감가상각누계액" },
  };
  return mapping[assetCode] || { code: "212", name: "비품감가상각누계액" };
}

export default function DepreciationPage() {
  const [assets, setAssets] = useState<DepreciationRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    const res = await fetch("/api/assets");
    const data: Asset[] = await res.json();
    const activeAssets = data.filter((a) => a.status === "active");
    const rows = activeAssets.map((a) => ({
      ...a,
      monthlyDepreciation: calcMonthlyDepreciation(a),
    }));
    setAssets(rows);
  }

  async function handleCreateVoucher() {
    setProcessing(true);
    setMessage("");

    const assetsToDepreciate = assets.filter((a) => a.monthlyDepreciation > 0);
    if (assetsToDepreciate.length === 0) {
      setMessage("상각 대상 자산이 없습니다.");
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: assetsToDepreciate.map((a) => ({
            id: a.id,
            name: a.name,
            account_code: a.account_code,
            monthlyDepreciation: a.monthlyDepreciation,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "전표 생성 실패");
      }

      setMessage("감가상각 전표가 생성되었습니다.");
      loadAssets();
    } catch (err: any) {
      setMessage(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  const totalAcquisition = assets.reduce((s, a) => s + a.acquisition_cost, 0);
  const totalAccum = assets.reduce((s, a) => s + a.accumulated_depreciation, 0);
  const totalBook = assets.reduce((s, a) => s + a.book_value, 0);
  const totalMonthly = assets.reduce((s, a) => s + a.monthlyDepreciation, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">감가상각</h2>
          <p className="text-muted-foreground">
            고정자산의 감가상각비를 자동 계산하고 상각 내역을 조회합니다.
          </p>
        </div>
        <Button onClick={handleCreateVoucher} disabled={processing || assets.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          {processing ? "처리 중..." : "감가상각 전표 생성"}
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.startsWith("오류") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            감가상각 명세
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">상각 대상 자산이 없습니다</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                고정자산을 먼저 등록하세요.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산명</TableHead>
                  <TableHead className="text-right">취득원가</TableHead>
                  <TableHead className="text-right">감가상각누계액</TableHead>
                  <TableHead className="text-right">장부가액</TableHead>
                  <TableHead className="text-right">월상각액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-right">
                      {formatKRW(asset.acquisition_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(asset.accumulated_depreciation)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(asset.book_value)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatKRW(asset.monthlyDepreciation)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>합계</TableCell>
                  <TableCell className="text-right">{formatKRW(totalAcquisition)}</TableCell>
                  <TableCell className="text-right">{formatKRW(totalAccum)}</TableCell>
                  <TableCell className="text-right">{formatKRW(totalBook)}</TableCell>
                  <TableCell className="text-right">{formatKRW(totalMonthly)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
