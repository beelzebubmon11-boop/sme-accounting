import Link from "next/link";
import { queryAll } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  const clients = queryAll<any>("SELECT * FROM clients WHERE is_deleted = 0 ORDER BY name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">거래처 관리</h2><p className="text-muted-foreground">거래처 정보를 관리합니다</p></div>
        <Button asChild><Link href="/clients/new"><Plus className="mr-2 h-4 w-4" />거래처 추가</Link></Button>
      </div>
      <Card><CardContent className="pt-6">
        {clients.length === 0 ? (
          <EmptyState icon={Users} title="등록된 거래처가 없습니다" description="거래처를 추가하여 매출/매입 관리를 시작하세요."
            action={<Button asChild><Link href="/clients/new"><Plus className="mr-2 h-4 w-4" />첫 거래처 추가하기</Link></Button>} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>거래처명</TableHead><TableHead>사업자번호</TableHead><TableHead>대표자</TableHead><TableHead>연락처</TableHead><TableHead>상태</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {clients.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell><Link href={`/clients/${client.id}`} className="font-medium text-primary hover:underline">{client.name}</Link></TableCell>
                  <TableCell>{client.business_number || "-"}</TableCell>
                  <TableCell>{client.representative_name || "-"}</TableCell>
                  <TableCell>{client.contact_phone || "-"}</TableCell>
                  <TableCell>{client.is_active ? "활성" : "비활성"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
