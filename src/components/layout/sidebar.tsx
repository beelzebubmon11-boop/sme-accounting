"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard, FileText, Search, Landmark, ArrowLeftRight, Upload,
  TrendingUp, ShoppingCart, BarChart3, Users, BookOpen, Scale,
  FileSpreadsheet, Calculator, Receipt, Building2, Hammer, ClipboardList,
  FileCheck, PiggyBank, DollarSign, Download, Settings, HelpCircle,
  ChevronDown, ChevronRight,
} from "lucide-react";

type NavItem = {
  href?: string;
  label: string;
  icon: any;
  children?: { href: string; label: string }[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  {
    label: "전표관리", icon: FileText,
    children: [
      { href: "/vouchers/new", label: "전표 입력" },
      { href: "/vouchers", label: "전표 조회" },
    ],
  },
  {
    label: "통장관리", icon: Landmark,
    children: [
      { href: "/accounts", label: "계좌 관리" },
      { href: "/bank-transactions/new", label: "입출금 등록" },
      { href: "/upload/bank-statement", label: "통장 엑셀 업로드" },
    ],
  },
  {
    label: "매출/매입", icon: TrendingUp,
    children: [
      { href: "/sales", label: "매출 관리" },
      { href: "/purchases", label: "매입 관리" },
    ],
  },
  { href: "/clients", label: "거래처", icon: Users },
  {
    label: "장부/원장", icon: BookOpen,
    children: [
      { href: "/reports/trial-balance", label: "합계잔액시산표" },
      { href: "/reports/general-ledger", label: "총계정원장" },
      { href: "/reports/account-ledger", label: "계정별원장" },
      { href: "/reports/client-ledger", label: "거래처원장" },
      { href: "/reports/client-summary", label: "거래처별 합계표" },
      { href: "/reports/cash-book", label: "현금출납장" },
      { href: "/reports/daily-monthly", label: "일/월계표" },
    ],
  },
  {
    label: "부가세", icon: Receipt,
    children: [
      { href: "/vat/return", label: "부가세 신고서" },
      { href: "/vat/invoices", label: "세금계산서 현황" },
    ],
  },
  {
    label: "고정자산", icon: Building2,
    children: [
      { href: "/assets", label: "자산 등록" },
      { href: "/assets/depreciation", label: "감가상각" },
      { href: "/assets/ledger", label: "자산 대장" },
    ],
  },
  {
    label: "결산/재무제표", icon: FileCheck,
    children: [
      { href: "/closing", label: "결산 마감" },
      { href: "/statements/balance-sheet", label: "재무상태표" },
      { href: "/statements/income-statement", label: "손익계산서" },
      { href: "/statements/cash-flow", label: "현금흐름표" },
    ],
  },
  { href: "/export", label: "내보내기 (위하고)", icon: Download },
  {
    label: "설정", icon: Settings,
    children: [
      { href: "/settings", label: "회사 정보" },
      { href: "/settings/chart-of-accounts", label: "계정과목 관리" },
      { href: "/settings/backup", label: "데이터 백업" },
    ],
  },
  { href: "/help", label: "도움말", icon: HelpCircle },
];

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(
    item.children?.some((c) => pathname.startsWith(c.href)) || false
  );

  if (item.href) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100"
        )}>
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
        <item.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && item.children && (
        <div className="ml-7 space-y-0.5 mt-0.5">
          {item.children.map((child) => {
            const isActive = pathname === child.href;
            return (
              <Link key={child.href} href={child.href}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}>
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold text-primary">SME 회계</Link>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">
        {navItems.map((item, i) => (
          <NavGroup key={i} item={item} />
        ))}
      </nav>
    </aside>
  );
}
