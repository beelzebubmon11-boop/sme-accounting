"use client";

import { useState, useEffect } from "react";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LedgerRow = {
  voucher_date: string;
  voucher_no: string;
  voucher_type: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  counterpart: string;
  client_name: string;
};

export default function AccountLedgerPage() {
  const [accounts, setAccounts] = useState<{ code: string; name: string }[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<LedgerRow[]>([]);

  useEffect(() => {
    fetch("/api/data/chart-of-accounts").then(r => r.json()).then(d => setAccounts(d));
  }, []);

  useEffect(() => {
    if (!selectedCode) { setData([]); return; }
    fetch(`/api/reports/account-ledger?code=${selectedCode}&start=${startDate}&end=${endDate}`)
      .then(r => r.json()).then(d => setData(d));
  }, [selectedCode, startDate, endDate]);

  const computedData = (() => {
    let bal = 0;
    return data.map(row => {
      bal += row.debit_amount - row.credit_amount;
      return { ...row, runningBalance: bal };
    });
  })();

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">계정별원장</h2><p className="text-muted-foreground">특정 계정의 전표 내역과 잔액</p></div>

      <Card><CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>계정과목</Label>
            <Select value={selectedCode} onValueChange={v => v && setSelectedCode(v)}>
              <SelectTrigger><SelectValue placeholder="계정 선택" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>시작일</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>종료일</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
      </CardContent></Card>

      {selectedCode && (
        <Card><CardHeader><CardTitle>{selectedCode} {accounts.find(a => a.code === selectedCode)?.name} 원장</CardTitle></CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">해당 기간에 전표가 없습니다.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>날짜</TableHead><TableHead>전표번호</TableHead><TableHead>적요</TableHead>
                  <TableHead>거래처</TableHead><TableHead>상대계정</TableHead>
                  <TableHead className="text-right">차변</TableHead><TableHead className="text-right">대변</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {computedData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">{formatDateShort(row.voucher_date)}</TableCell>
                        <TableCell className="font-mono text-xs">{row.voucher_no}</TableCell>
                        <TableCell>{row.description || "-"}</TableCell>
                        <TableCell>{row.client_name || "-"}</TableCell>
                        <TableCell>{row.counterpart || "-"}</TableCell>
                        <TableCell className="text-right">{row.debit_amount > 0 ? formatKRW(row.debit_amount) : ""}</TableCell>
                        <TableCell className="text-right">{row.credit_amount > 0 ? formatKRW(row.credit_amount) : ""}</TableCell>
                        <TableCell className="text-right font-medium">{formatKRW(row.runningBalance)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
