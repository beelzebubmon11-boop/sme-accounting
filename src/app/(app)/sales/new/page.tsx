"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { formatKRW } from "@/lib/format";
import { Save } from "lucide-react";

export default function SaleNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const [clientId, setClientId] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [itemDescription, setItemDescription] = useState("");
  const [supplyAmount, setSupplyAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [isTaxInvoice, setIsTaxInvoice] = useState(false);
  const [memo, setMemo] = useState("");

  const totalAmount = supplyAmount + taxAmount;

  useEffect(() => {
    fetch("/api/data/clients")
      .then((r) => r.json())
      .then((d) => setClients(d));
  }, []);

  // Auto-calculate 10% VAT when supply amount changes
  useEffect(() => {
    setTaxAmount(Math.round(supplyAmount * 0.1));
  }, [supplyAmount]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("client_id", clientId);
    formData.set("sale_date", saleDate);
    formData.set("item_description", itemDescription);
    formData.set("supply_amount", String(supplyAmount));
    formData.set("tax_amount", String(taxAmount));
    formData.set("is_tax_invoice", isTaxInvoice ? "true" : "false");
    formData.set("memo", memo);

    const result = await createSale(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/sales");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">매출 등록</h2>
        <p className="text-muted-foreground">
          새로운 매출 거래를 등록합니다
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>매출 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>거래처</Label>
              <Select value={clientId} onValueChange={(v) => v && setClientId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="거래처를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>매출일</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>품목</Label>
              <Input
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="품목명을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label>공급가액</Label>
              <CurrencyInput
                value={supplyAmount}
                onChange={setSupplyAmount}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>부가세 (자동 10%)</Label>
              <CurrencyInput
                value={taxAmount}
                onChange={setTaxAmount}
                placeholder="0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">합계 금액</p>
                  <p className="text-2xl font-bold">{formatKRW(totalAmount)}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>공급가액: {formatKRW(supplyAmount)}</p>
                  <p>부가세: {formatKRW(taxAmount)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_tax_invoice"
                checked={isTaxInvoice}
                onCheckedChange={(checked) =>
                  setIsTaxInvoice(checked === true)
                }
              />
              <Label htmlFor="is_tax_invoice">세금계산서 발행</Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>메모</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모를 입력하세요 (선택)"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "저장 중..." : "매출 저장"}
        </Button>
      </div>
    </div>
  );
}
