"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createVoucherAction } from "@/actions/vouchers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { formatNumber } from "@/lib/format";

const VOUCHER_TYPES = [
  { value: "deposit", label: "입금전표" },
  { value: "withdrawal", label: "출금전표" },
  { value: "transfer", label: "대체전표" },
  { value: "sale", label: "매출전표" },
  { value: "purchase", label: "매입전표" },
  { value: "general", label: "일반전표" },
];

type VoucherLine = {
  id: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  clientId: string;
  description: string;
};

export default function NewVoucherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voucherType, setVoucherType] = useState("general");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<{ code: string; name: string; category: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [lines, setLines] = useState<VoucherLine[]>([
    { id: 1, accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, clientId: "", description: "" },
    { id: 2, accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, clientId: "", description: "" },
  ]);
  const [nextId, setNextId] = useState(3);

  useEffect(() => {
    // Load chart of accounts and clients from API
    fetch("/api/data/chart-of-accounts").then(r => r.json()).then(d => setAccounts(d));
    fetch("/api/data/clients").then(r => r.json()).then(d => setClients(d));
  }, []);

  function addLine() {
    setLines([...lines, { id: nextId, accountCode: "", accountName: "", debitAmount: 0, creditAmount: 0, clientId: "", description: "" }]);
    setNextId(nextId + 1);
  }

  function removeLine(id: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter(l => l.id !== id));
  }

  function updateLine(id: number, field: keyof VoucherLine, value: any) {
    setLines(lines.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // Auto-fill account name
      if (field === "accountCode") {
        const acc = accounts.find(a => a.code === value);
        if (acc) updated.accountName = acc.name;
      }
      return updated;
    }));
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const validLines = lines.filter(l => l.accountCode && (l.debitAmount > 0 || l.creditAmount > 0));
    if (validLines.length < 2) {
      setError("최소 2개 이상의 전표 라인이 필요합니다.");
      setLoading(false);
      return;
    }

    const result = await createVoucherAction({
      voucherType: voucherType as any,
      voucherDate,
      description,
      lines: validLines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
        clientId: l.clientId || null,
        description: l.description,
      })),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/vouchers");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">전표 입력</h2>
        <p className="text-muted-foreground">복식부기 전표를 직접 입력합니다</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader><CardTitle>전표 정보</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>전표 유형</Label>
              <Select value={voucherType} onValueChange={(v) => v && setVoucherType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>전표일</Label>
              <Input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>적요</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="거래 내용을 입력하세요" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>전표 라인 (차변/대변)</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="mr-1 h-4 w-4" />라인 추가</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">계정코드</TableHead>
                <TableHead>계정과목</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead className="text-right w-36">차변 금액</TableHead>
                <TableHead className="text-right w-36">대변 금액</TableHead>
                <TableHead>적요</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Select value={line.accountCode} onValueChange={v => v && updateLine(line.id, "accountCode", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="코드" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{line.accountName || "-"}</TableCell>
                  <TableCell>
                    <Select value={line.clientId} onValueChange={v => updateLine(line.id, "clientId", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">없음</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-sm" value={line.debitAmount || ""}
                      onChange={e => updateLine(line.id, "debitAmount", Number(e.target.value) || 0)}
                      placeholder="0" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-sm" value={line.creditAmount || ""}
                      onChange={e => updateLine(line.id, "creditAmount", Number(e.target.value) || 0)}
                      placeholder="0" />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" value={line.description}
                      onChange={e => updateLine(line.id, "description", e.target.value)} placeholder="적요" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* 합계 */}
              <TableRow className="font-bold bg-gray-50">
                <TableCell colSpan={3} className="text-right">합계</TableCell>
                <TableCell className="text-right">{formatNumber(totalDebit)}</TableCell>
                <TableCell className="text-right">{formatNumber(totalCredit)}</TableCell>
                <TableCell colSpan={2}>
                  {isBalanced ? (
                    <span className="text-green-600 text-sm">차대 균형</span>
                  ) : totalDebit > 0 || totalCredit > 0 ? (
                    <span className="text-red-600 text-sm">차액: {formatNumber(Math.abs(totalDebit - totalCredit))}</span>
                  ) : null}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>취소</Button>
        <Button onClick={handleSubmit} disabled={loading || !isBalanced}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "저장 중..." : "전표 저장"}
        </Button>
      </div>
    </div>
  );
}
