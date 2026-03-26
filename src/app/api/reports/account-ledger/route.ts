import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!code || !start || !end) {
    return NextResponse.json([]);
  }

  const data = queryAll(
    `SELECT
      v.voucher_date, v.voucher_no, v.voucher_type, v.description,
      vl.debit_amount, vl.credit_amount,
      c.name as client_name,
      (SELECT account_name FROM voucher_lines
       WHERE voucher_id = vl.voucher_id AND id != vl.id LIMIT 1) as counterpart
    FROM voucher_lines vl
    JOIN vouchers v ON v.id = vl.voucher_id
    LEFT JOIN clients c ON c.id = vl.client_id
    WHERE vl.account_code = ? AND v.voucher_date >= ? AND v.voucher_date <= ?
    ORDER BY v.voucher_date, v.voucher_no`,
    code, start, end
  );

  return NextResponse.json(data);
}
