import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function CashBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">현금출납장</h2>
        <p className="text-muted-foreground">현금 입출금 내역을 일자별로 조회하고 잔액을 관리합니다.</p>
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
