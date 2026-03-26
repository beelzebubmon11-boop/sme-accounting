"use client";

import { useState, useEffect } from "react";
import { formatKRW, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClientLedgerPage() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => { fetch("/api/data/clients").then(r => r.json()).then(setClients); }, []);
  useEffect(() => {
    if (!selectedId) { setData([]); return; }
    fetch(`/api/reports/client-ledger?id=${selectedId}&start=${startDate}&end=${endDate}`).then(r => r.json()).then(setData);
  }, [selectedId, startDate, endDate]);

  let balance = 0;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">거래처원장</h2><p className="text-muted-foreground">특정 거래처의 전표 내역과 잔액</p></div>
      <Card><CardContent className="pt-6"><div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>거래처</Label><Select value={selectedId} onValueChange={v => v && setSelectedId(v)}><SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>시작일</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>종료일</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div></CardContent></Card>
      {selectedId && <Card><CardHeader><CardTitle>{clients.find(c=>c.id===selectedId)?.name} 원장</CardTitle></CardHeader><CardContent>
        {data.length === 0 ? <p className="text-center text-muted-foreground py-8">데이터 없음</p> : (
          <Table><TableHeader><TableRow><TableHead>날짜</TableHead><TableHead>전표번호</TableHead><TableHead>계정</TableHead><TableHead>적요</TableHead><TableHead className="text-right">차변</TableHead><TableHead className="text-right">대변</TableHead><TableHead className="text-right">잔액</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((r: any, i: number) => { balance += r.debit_amount - r.credit_amount; return (
            <TableRow key={i}><TableCell className="whitespace-nowrap">{formatDateShort(r.voucher_date)}</TableCell><TableCell className="font-mono text-xs">{r.voucher_no}</TableCell><TableCell>{r.account_code} {r.account_name}</TableCell><TableCell>{r.description||"-"}</TableCell>
            <TableCell className="text-right">{r.debit_amount>0?formatKRW(r.debit_amount):""}</TableCell><TableCell className="text-right">{r.credit_amount>0?formatKRW(r.credit_amount):""}</TableCell><TableCell className="text-right font-medium">{formatKRW(balance)}</TableCell></TableRow>); })}</TableBody></Table>)}
      </CardContent></Card>}
    </div>
  );
}
