"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import { CheckCircle, Lock, AlertCircle } from "lucide-react";

interface Closing {
  id: string;
  fiscal_year: number;
  closing_date: string;
  status: string;
  closed_at: string | null;
  memo: string | null;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
  description: string;
}

export default function ClosingPage() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [closings, setClosings] = useState<Closing[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClosings();
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [fiscalYear]);

  async function loadClosings() {
    const res = await fetch("/api/closing");
    const data = await res.json();
    setClosings(data);
  }

  async function loadChecklist() {
    const res = await fetch(`/api/closing/checklist?year=${fiscalYear}`);
    const data = await res.json();
    setChecklist(data);
  }

  async function handleClose() {
    setLoading(true);
    setMessage("");

    const unchecked = checklist.filter((c) => !c.checked);
    if (unchecked.length > 0) {
      setMessage(`미완료 항목이 있습니다: ${unchecked.map((c) => c.label).join(", ")}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: fiscalYear }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "결산 마감 실패");
      }

      setMessage(`${fiscalYear}년 결산이 마감되었습니다.`);
      loadClosings();
    } catch (err: any) {
      setMessage(`오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const allChecked = checklist.length > 0 && checklist.every((c) => c.checked);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">결산 마감</h2>
        <p className="text-muted-foreground">
          회계 기간의 결산을 수행하고 마감 처리를 진행합니다.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.startsWith("오류") || message.startsWith("미완료")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>결산 연도 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>회계연도</Label>
              <Input
                type="number"
                min={2000}
                max={2099}
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>결산 체크리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  item.checked ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                }`}
              >
                {item.checked ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleClose}
              disabled={loading || !allChecked}
              variant={allChecked ? "default" : "secondary"}
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "마감 처리 중..." : `${fiscalYear}년 결산 마감`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>결산 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {closings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">결산 이력이 없습니다</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                결산 마감을 수행하면 이력이 표시됩니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회계연도</TableHead>
                  <TableHead>마감일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>마감처리일시</TableHead>
                  <TableHead>메모</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.map((closing) => (
                  <TableRow key={closing.id}>
                    <TableCell className="font-medium">{closing.fiscal_year}년</TableCell>
                    <TableCell>{formatDateShort(closing.closing_date)}</TableCell>
                    <TableCell>
                      <Badge variant={closing.status === "closed" ? "default" : "secondary"}>
                        {closing.status === "closed" ? "마감완료" : "진행중"}
                      </Badge>
                    </TableCell>
                    <TableCell>{closing.closed_at || "-"}</TableCell>
                    <TableCell>{closing.memo || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
