"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { BANKS, ACCOUNT_TYPES } from "@/lib/constants";

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("initial_balance", String(initialBalance));

    const result = await createAccount(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/accounts");
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>새 계좌 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">계좌 이름</Label>
              <Input
                id="name"
                name="name"
                placeholder="예: 기업은행 운영계좌"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">은행</Label>
              <Select name="bank_name" required>
                <SelectTrigger>
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">계좌번호 (선택)</Label>
              <Input
                id="account_number"
                name="account_number"
                placeholder="000-000000-00-000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">계좌 유형</Label>
              <Select name="account_type" defaultValue="checking">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>초기 잔액</Label>
              <CurrencyInput
                value={initialBalance}
                onChange={setInitialBalance}
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "추가 중..." : "계좌 추가"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
