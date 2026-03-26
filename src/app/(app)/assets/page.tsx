"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/currency-input";
import { formatKRW } from "@/lib/format";
import { Plus, Save, Package } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  account_code: string;
  account_name: string;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life: number;
  depreciation_method: string;
  salvage_value: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface AccountOption {
  code: string;
  name: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [acquisitionCost, setAcquisitionCost] = useState(0);
  const [usefulLife, setUsefulLife] = useState(5);
  const [depreciationMethod, setDepreciationMethod] = useState("straight");
  const [salvageValue, setSalvageValue] = useState(0);

  useEffect(() => {
    loadAssets();
    loadAccounts();
  }, []);

  async function loadAssets() {
    const res = await fetch("/api/assets");
    const data = await res.json();
    setAssets(data);
  }

  async function loadAccounts() {
    const res = await fetch("/api/data/chart-of-accounts");
    const data = await res.json();
    const filtered = data.filter(
      (a: any) => a.category === "asset" && a.sub_category === "비유동자산" && !a.name.includes("감가상각")
    );
    setAccounts(filtered);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!name || !accountCode || !acquisitionCost) {
      setError("자산명, 계정과목, 취득원가는 필수 입력입니다.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          account_code: accountCode,
          acquisition_date: acquisitionDate,
          acquisition_cost: acquisitionCost,
          useful_life: usefulLife,
          depreciation_method: depreciationMethod,
          salvage_value: salvageValue,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록 실패");
      }

      setSuccess("고정자산이 등록되었습니다.");
      setName("");
      setAccountCode("");
      setAcquisitionCost(0);
      setUsefulLife(5);
      setDepreciationMethod("straight");
      setSalvageValue(0);
      loadAssets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">고정자산 등록</h2>
        <p className="text-muted-foreground">
          고정자산을 등록하고 자산 정보를 관리합니다.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            자산 등록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>자산명</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="자산명을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label>계정과목</Label>
              <Select value={accountCode} onValueChange={(v) => v && setAccountCode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="계정과목을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>취득일</Label>
              <Input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>취득원가</Label>
              <CurrencyInput
                value={acquisitionCost}
                onChange={setAcquisitionCost}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>내용연수 (년)</Label>
              <Input
                type="number"
                min={1}
                value={usefulLife}
                onChange={(e) => setUsefulLife(Number(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>상각방법</Label>
              <Select
                value={depreciationMethod}
                onValueChange={(v) => v && setDepreciationMethod(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight">정액법</SelectItem>
                  <SelectItem value="declining">정률법</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>잔존가액</Label>
              <CurrencyInput
                value={salvageValue}
                onChange={setSalvageValue}
                placeholder="0"
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "등록 중..." : "자산 등록"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>등록된 고정자산</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">등록된 자산이 없습니다</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                위 양식에서 고정자산을 등록하세요.
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
                  <TableHead className="text-right">장부가액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.account_code} {asset.account_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{asset.acquisition_date}</TableCell>
                    <TableCell className="text-right">{formatKRW(asset.acquisition_cost)}</TableCell>
                    <TableCell>{asset.useful_life}년</TableCell>
                    <TableCell>{asset.depreciation_method === "straight" ? "정액법" : "정률법"}</TableCell>
                    <TableCell className="text-right">{formatKRW(asset.book_value)}</TableCell>
                    <TableCell>
                      <Badge variant={asset.status === "active" ? "default" : "secondary"}>
                        {asset.status === "active" ? "사용중" : "처분"}
                      </Badge>
                    </TableCell>
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
