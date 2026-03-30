import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!id || !start || !end) return NextResponse.json([]);

  const data = await queryAll(
    `SELECT v.voucher_date, v.voucher_no, vl.account_code, vl.account_name,
            vl.debit_amount, vl.credit_amount, v.description
     FROM voucher_lines vl
     JOIN vouchers v ON v.id = vl.voucher_id
     WHERE vl.client_id = ? AND v.voucher_date >= ? AND v.voucher_date <= ?
     ORDER BY v.voucher_date, v.voucher_no, vl.line_order`,
    id, start, end
  );
  return NextResponse.json(data);
}
