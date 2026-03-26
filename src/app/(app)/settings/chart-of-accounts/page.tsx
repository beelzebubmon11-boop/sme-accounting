"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

type CoaItem = { code: string; name: string; category: string; sub_category: string };

const CATEGORY_LABELS: Record<string, string> = {
  asset: "자산", liability: "부채", equity: "자본", revenue: "수익", expense: "비용",
};

export default function ChartOfAccountsPage() {
  const [items, setItems] = useState<CoaItem[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/data/chart-of-accounts").then(r => r.json()).then(d => setItems(d));
  }, []);

  const filtered = filter ? items.filter(i => i.category === filter) : items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">계정과목 관리</h2><p className="text-muted-foreground">더존 표준 계정과목</p></div>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex gap-2 mb-4">
          <Button variant={!filter ? "default" : "outline"} size="sm" onClick={() => setFilter("")}>전체</Button>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <Button key={k} variant={filter === k ? "default" : "outline"} size="sm" onClick={() => setFilter(k)}>{v}</Button>
          ))}
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>코드</TableHead><TableHead>계정과목</TableHead><TableHead>분류</TableHead><TableHead>소분류</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(item => (
              <TableRow key={item.code}>
                <TableCell className="font-mono">{item.code}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{item.sub_category}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
