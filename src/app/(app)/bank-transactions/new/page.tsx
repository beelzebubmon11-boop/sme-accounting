"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function BankTransactionNewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">입출금 등록</h2>
        <p className="text-muted-foreground">입금 및 출금 거래를 등록하고 자동으로 전표를 생성합니다.</p>
      </div>
      <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Construction className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">준비 중</h3>
          <p className="mt-2 text-sm text-muted-foreground">이 기능은 곧 추가됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
