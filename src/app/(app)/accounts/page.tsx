import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const accounts = queryAll<any>("SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY created_at");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">통장관리</h2>
          <p className="text-muted-foreground">계좌별 잔액을 관리합니다</p>
        </div>
        <Button asChild><Link href="/accounts/new"><Plus className="mr-2 h-4 w-4" />계좌 추가</Link></Button>
      </div>

      {accounts.length === 0 ? (
        <Card><CardContent className="pt-6">
          <EmptyState icon={Landmark} title="등록된 계좌가 없습니다" description="새 계좌를 추가하여 통장 관리를 시작하세요."
            action={<Button asChild><Link href="/accounts/new"><Plus className="mr-2 h-4 w-4" />첫 계좌 추가하기</Link></Button>} />
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: any) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                      {account.account_number && <p className="text-xs text-muted-foreground mt-1">{account.account_number}</p>}
                    </div>
                    <Badge variant={account.is_active ? "default" : "secondary"}>{account.is_active ? "활성" : "비활성"}</Badge>
                  </div>
                  <p className="mt-4 text-2xl font-bold">{formatKRW(account.current_balance)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
