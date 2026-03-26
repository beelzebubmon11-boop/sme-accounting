"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Database, Info } from "lucide-react";

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        throw new Error("백업 다운로드 실패");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      a.href = url;
      a.download = `sme-accounting-backup-${dateStr}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("백업 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">데이터 백업</h2>
        <p className="text-muted-foreground">
          회계 데이터를 백업하고 복원 기능을 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터베이스 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">데이터베이스 형식</span>
              <Badge variant="outline">SQLite</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">저장 위치</span>
              <span className="text-sm text-muted-foreground font-mono">
                {typeof window !== "undefined" ? "앱 데이터 디렉토리" : ""}/dev-data.db
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>백업 다운로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            현재 회계 데이터베이스 파일을 다운로드합니다. 모든 거래, 전표, 계정과목, 거래처
            정보가 포함됩니다.
          </p>
          <Button onClick={handleDownload} disabled={downloading} size="lg">
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "다운로드 중..." : "백업 다운로드"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            복원 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
            <p className="font-medium">데이터 복원 방법</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>앱을 종료합니다.</li>
              <li>백업 파일(.db)을 앱 데이터 디렉토리에 복사합니다.</li>
              <li>
                기존 데이터베이스 파일명을 백업 파일명으로 변경합니다.
              </li>
              <li>앱을 다시 시작합니다.</li>
            </ol>
          </div>
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
            <p className="font-medium text-yellow-800">주의사항</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-yellow-700">
              <li>복원 시 현재 데이터가 덮어씌워집니다.</li>
              <li>복원 전 반드시 현재 데이터를 백업하세요.</li>
              <li>백업 파일은 안전한 장소에 보관하세요.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
