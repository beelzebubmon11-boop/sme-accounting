import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function BankStatementUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">통장 엑셀 업로드</h2>
        <p className="text-muted-foreground">은행 통장 엑셀 파일을 업로드하여 거래 내역을 일괄 등록합니다.</p>
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
