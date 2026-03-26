"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBankTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";

export default function NewBankTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(0);
  const [accounts, setAccounts] = useState<{ id: string; name: string; bank_name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/data/accounts").then(r => r.json()),
      fetch("/api/data/categories").then(r => r.json()),
      fetch("/api/data/clients").then(r => r.json()),
    ]).then(([a, c, cl]) => { setAccounts(a); setCategories(c); setClients(cl); });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("amount", String(amount));
    const result = await createBankTransaction(formData);
    if (result.error) { setError(result.error); setLoading(false); return; }
    router.push("/vouchers");
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-lg">
      <Card><CardHeader><CardTitle>입출금 등록</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div className="space-y-2"><Label>계좌 *</Label>
            <Select name="account_id" required><SelectTrigger><SelectValue placeholder="계좌 선택" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.bank_name})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>거래 유형 *</Label>
            <Select name="type" required><SelectTrigger><SelectValue placeholder="입금/출금" /></SelectTrigger>
              <SelectContent><SelectItem value="deposit">입금</SelectItem><SelectItem value="withdrawal">출금</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>금액 *</Label><CurrencyInput value={amount} onChange={setAmount} /></div>
          <div className="space-y-2"><Label>거래일 *</Label><Input type="date" name="transaction_date" defaultValue={today} required /></div>
          <div className="space-y-2"><Label>적요</Label><Input name="description" placeholder="거래 내용" /></div>
          <div className="space-y-2"><Label>분류</Label>
            <Select name="category_id"><SelectTrigger><SelectValue placeholder="분류 선택" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>거래처</Label>
            <Select name="client_id"><SelectTrigger><SelectValue placeholder="거래처 선택" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>취소</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "등록 중..." : "입출금 등록"}</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
