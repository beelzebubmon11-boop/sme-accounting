"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/accounts": "통장관리",
  "/transactions": "입출금 내역",
  "/sales": "매출 관리",
  "/purchases": "매입 관리",
  "/clients": "거래처 관리",
  "/retained-earnings": "유보금 관리",
  "/export": "위하고 내보내기",
  "/settings": "설정",
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return title;
    }
  }
  return "SME 회계";
}

export function TopNav() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
      <Sheet>
        <SheetTrigger className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent hover:text-accent-foreground">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">네비게이션</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
