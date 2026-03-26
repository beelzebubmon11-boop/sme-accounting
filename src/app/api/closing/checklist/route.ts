import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryAll } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Check 1: Depreciation processed
  const depreciationVoucher = queryOne<any>(
    `SELECT COUNT(*) as cnt FROM vouchers v
     JOIN voucher_lines vl ON vl.voucher_id = v.id
     WHERE vl.account_code = '820'
     AND v.voucher_date >= ? AND v.voucher_date <= ?`,
    startDate,
    endDate
  );
  const hasDepreciation = (depreciationVoucher?.cnt || 0) > 0;

  // Check 2: Trial balance (debits = credits)
  const trialBalance = queryOne<any>(
    `SELECT
      COALESCE(SUM(vl.debit_amount), 0) as total_debit,
      COALESCE(SUM(vl.credit_amount), 0) as total_credit
     FROM voucher_lines vl
     JOIN vouchers v ON v.id = vl.voucher_id
     WHERE v.voucher_date >= ? AND v.voucher_date <= ?`,
    startDate,
    endDate
  );
  const isBalanced =
    trialBalance && trialBalance.total_debit === trialBalance.total_credit;

  // Check if there are any fixed assets needing depreciation
  const activeAssets = queryOne<any>(
    "SELECT COUNT(*) as cnt FROM fixed_assets WHERE status = 'active'"
  );
  const hasActiveAssets = (activeAssets?.cnt || 0) > 0;

  const checklist = [
    {
      label: "감가상각 처리 여부",
      checked: !hasActiveAssets || hasDepreciation,
      description: hasActiveAssets
        ? hasDepreciation
          ? `${year}년 감가상각 전표가 처리되었습니다.`
          : "고정자산의 감가상각 전표를 먼저 생성하세요."
        : "등록된 고정자산이 없어 감가상각이 불필요합니다.",
    },
    {
      label: "시산표 차대 균형 여부",
      checked: isBalanced,
      description: isBalanced
        ? "차변 합계와 대변 합계가 일치합니다."
        : `차변: ${trialBalance?.total_debit?.toLocaleString() || 0}원, 대변: ${trialBalance?.total_credit?.toLocaleString() || 0}원 - 불일치합니다.`,
    },
  ];

  return NextResponse.json(checklist);
}
