"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { formatKRW } from "@/lib/format";

type SheetData = { sheetName: string; headers: string[]; rows: any[][] };
type ParsedRow = { date: string; deposit: number; withdrawal: number; balance: number; description: string; include: boolean };

export default function BankStatementUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accounts, setAccounts] = useState<{ id: string; name: string; bank_name: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [mapping, setMapping] = useState({ date: 0, deposit: 1, withdrawal: 2, balance: 3, description: 4 });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/data/accounts").then(r => r.json()).then(d => setAccounts(d));
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch("/api/excel/parse", { method: "POST", body: buffer, headers: { "Content-Type": "application/octet-stream" } });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setSheets(data.sheets);
      if (data.sheets.length > 0) {
        const det = data.autoMapping || {};
        setMapping({ date: det.date ?? 0, deposit: det.deposit ?? 1, withdrawal: det.withdrawal ?? 2, balance: det.balance ?? 3, description: det.description ?? 4 });
      }
      setStep(2);
    } catch { setError("엑셀 파일을 읽는 중 오류가 발생했습니다."); }
  }

  function applyMappingAndPreview() {
    if (sheets.length === 0) return;
    const sheet = sheets[selectedSheet];
    const rows: ParsedRow[] = [];
    for (const row of sheet.rows) {
      const dateRaw = row[mapping.date] || "";
      let date = String(dateRaw).replace(/\./g, "-").replace(/\//g, "-").trim();
      if (/^\d{8}$/.test(date)) date = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      if (!/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
      date = date.slice(0, 10);
      const parseAmt = (v: any) => Math.abs(Number(String(v).replace(/[,\s원₩]/g, ""))) || 0;
      const deposit = parseAmt(row[mapping.deposit]);
      const withdrawal = parseAmt(row[mapping.withdrawal]);
      if (deposit === 0 && withdrawal === 0) continue;
      rows.push({ date, deposit, withdrawal, balance: parseAmt(row[mapping.balance]), description: String(row[mapping.description] || "").trim(), include: true });
    }
    setParsedRows(rows);
    setStep(3);
  }

  function toggleRow(idx: number) { setParsedRows(prev => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r)); }

  async function handleImport() {
    if (!selectedAccountId) { setError("계좌를 선택하세요."); return; }
    setLoading(true); setError("");
    const rows = parsedRows.filter(r => r.include);
    const res = await fetch("/api/bank/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: selectedAccountId, rows }) });
    const result = await res.json();
    if (result.error) { setError(result.error); setLoading(false); return; }
    router.push(`/accounts/${selectedAccountId}`);
  }

  const includedRows = parsedRows.filter(r => r.include);
  const totalDeposit = includedRows.reduce((s, r) => s + r.deposit, 0);
  const totalWithdrawal = includedRows.reduce((s, r) => s + r.withdrawal, 0);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">통장 엑셀 업로드</h2><p className="text-muted-foreground">은행에서 다운받은 엑셀 파일로 자동 입출금 전표 생성</p></div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="inline h-4 w-4 mr-1" />{error}</div>}

      <div className="flex gap-4 text-sm">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex items-center gap-2 ${step >= s ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= s ? "bg-primary text-white" : "bg-gray-200"}`}>{step > s ? <Check className="h-3 w-3" /> : s}</div>
            {s === 1 ? "파일 선택" : s === 2 ? "컬럼 매핑" : "미리보기"}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card><CardHeader><CardTitle>1. 파일 선택</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>대상 계좌</Label>
            <Select value={selectedAccountId} onValueChange={v => v && setSelectedAccountId(v)}><SelectTrigger><SelectValue placeholder="계좌 선택" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.bank_name})</SelectItem>)}</SelectContent></Select></div>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">엑셀 파일을 선택하세요 (날짜/입금/출금/잔액/적요)</p>
            <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="mt-4 max-w-xs mx-auto" />
          </div>
        </CardContent></Card>
      )}

      {step === 2 && sheets.length > 0 && (
        <Card><CardHeader><CardTitle>2. 컬럼 매핑</CardTitle><CardDescription>자동 감지된 매핑을 확인하세요</CardDescription></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            {(["date", "deposit", "withdrawal", "balance", "description"] as const).map(field => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">{field === "date" ? "날짜" : field === "deposit" ? "입금" : field === "withdrawal" ? "출금" : field === "balance" ? "잔액" : "적요"}</Label>
                <Select value={String(mapping[field])} onValueChange={v => setMapping({ ...mapping, [field]: Number(v) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{sheets[selectedSheet].headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `열${i + 1}`}</SelectItem>)}</SelectContent></Select>
              </div>
            ))}
          </div>
          <div className="flex gap-3"><Button variant="outline" onClick={() => setStep(1)}>이전</Button><Button onClick={applyMappingAndPreview}>다음</Button></div>
        </CardContent></Card>
      )}

      {step === 3 && (
        <Card><CardHeader><CardTitle>3. 미리보기</CardTitle>
          <CardDescription>{parsedRows.length}건 중 {includedRows.length}건 선택 | 입금 {formatKRW(totalDeposit)} | 출금 {formatKRW(totalWithdrawal)}</CardDescription></CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow>
              <TableHead className="w-10">선택</TableHead><TableHead>날짜</TableHead><TableHead>적요</TableHead>
              <TableHead className="text-right">입금</TableHead><TableHead className="text-right">출금</TableHead><TableHead className="text-right">잔액</TableHead>
            </TableRow></TableHeader><TableBody>
              {parsedRows.map((row, i) => (
                <TableRow key={i} className={row.include ? "" : "opacity-40"}>
                  <TableCell><input type="checkbox" checked={row.include} onChange={() => toggleRow(i)} /></TableCell>
                  <TableCell className="whitespace-nowrap">{row.date}</TableCell><TableCell>{row.description || "-"}</TableCell>
                  <TableCell className="text-right text-green-600">{row.deposit > 0 ? formatKRW(row.deposit) : ""}</TableCell>
                  <TableCell className="text-right text-red-600">{row.withdrawal > 0 ? formatKRW(row.withdrawal) : ""}</TableCell>
                  <TableCell className="text-right">{row.balance > 0 ? formatKRW(row.balance) : ""}</TableCell>
                </TableRow>))}
            </TableBody></Table></div>
            <div className="flex gap-3 mt-4"><Button variant="outline" onClick={() => setStep(2)}>이전</Button>
              <Button onClick={handleImport} disabled={loading || includedRows.length === 0}><Upload className="mr-2 h-4 w-4" />{loading ? "등록 중..." : `${includedRows.length}건 등록`}</Button></div>
          </CardContent></Card>
      )}
    </div>
  );
}
