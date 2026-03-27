import { queryAll } from "@/lib/db/client";
import { formatKRW } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const accounts = queryAll<{ id: string; name: string; bank_name: string; account_number: string | null; current_balance: number }>(
    "SELECT * FROM accounts WHERE is_active = 1 AND is_deleted = 0 ORDER BY created_at"
  );

  const recentTransactions = queryAll<any>(
    `SELECT v.id, v.voucher_no, v.voucher_type as type, v.voucher_date as transaction_date,
            v.description, a.name as account_name,
            COALESCE(SUM(vl.debit_amount), 0) as debit_total,
            COALESCE(SUM(vl.credit_amount), 0) as credit_total
     FROM vouchers v
     LEFT JOIN accounts a ON a.id = v.account_id
     LEFT JOIN voucher_lines vl ON vl.voucher_id = v.id
     WHERE v.is_deleted = 0 AND v.is_closing = 0
     GROUP BY v.id
     ORDER BY v.voucher_date DESC, v.created_at DESC LIMIT 10`
  );

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  const monthlySales = queryAll<{ total_amount: number }>(
    "SELECT total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ? AND is_deleted = 0", monthStart, monthEnd
  );
  const monthlyPurchases = queryAll<{ total_amount: number }>(
    "SELECT total_amount FROM purchases WHERE purchase_date >= ? AND purchase_date <= ? AND is_deleted = 0", monthStart, monthEnd
  );

  const totalMonthlySales = monthlySales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalMonthlyPurchases = monthlyPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const monthlyNetIncome = totalMonthlySales - totalMonthlyPurchases;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 잔액</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKRW(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">{accounts.length}개 계좌</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatKRW(totalMonthlySales)}</div>
            <p className="text-xs text-muted-foreground">{monthlySales.length}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매입</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatKRW(totalMonthlyPurchases)}</div>
            <p className="text-xs text-muted-foreground">{monthlyPurchases.length}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 순이익</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyNetIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatKRW(monthlyNetIncome)}
            </div>
            <p className="text-xs text-muted-foreground">매출 - 매입</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계좌 잔액 현황</CardTitle>
          <CardDescription>활성 계좌별 현재 잔액</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">등록된 계좌가 없습니다. 통장관리에서 계좌를 추가하세요.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.bank_name}{account.account_number && ` · ${account.account_number}`}</p>
                  </div>
                  <p className="text-lg font-semibold">{formatKRW(account.current_balance)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 거래</CardTitle>
          <CardDescription>최근 10건의 입출금 내역</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">입출금 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{tx.description || "(적요 없음)"}</p>
                    <p className="text-sm text-muted-foreground">{tx.transaction_date} · {tx.account_name}</p>
                  </div>
                  <p className={`text-lg font-semibold ${tx.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "deposit" ? "+" : "-"}{formatKRW(tx.type === "deposit" ? tx.debit_total : tx.credit_total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
