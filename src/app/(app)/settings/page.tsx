"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/data/profile").then(r => r.json()).then(data => {
      if (data) {
        setCompanyName(data.company_name || "");
        setBusinessNumber(data.business_number || "");
        setRepresentativeName(data.representative_name || "");
      }
    });
  }, []);

  async function handleSave() {
    setLoading(true);
    const res = await fetch("/api/data/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName, business_number: businessNumber, representative_name: representativeName }),
    });
    if (res.ok) toast.success("회사 정보가 저장되었습니다.");
    else toast.error("저장에 실패했습니다.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">설정</h2><p className="text-muted-foreground">회사 정보를 관리합니다</p></div>
      <Card><CardHeader><CardTitle>회사 정보</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>회사명</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
          <div className="space-y-2"><Label>사업자등록번호</Label><Input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} placeholder="000-00-00000" /></div>
          <div className="space-y-2"><Label>대표자명</Label><Input value={representativeName} onChange={e => setRepresentativeName(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={loading}>{loading ? "저장 중..." : "저장"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
