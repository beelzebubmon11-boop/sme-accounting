import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET() {
  try {
    // Export all data as JSON backup (works on both local and serverless)
    const tables = [
      "profiles", "chart_of_accounts", "clients", "categories",
      "accounts", "vouchers", "voucher_lines", "sales", "purchases",
      "fixed_assets", "vat_periods", "fiscal_closings", "opening_balances",
    ];

    const backup: Record<string, any[]> = {};
    for (const table of tables) {
      try {
        backup[table] = await queryAll(`SELECT * FROM ${table}`);
      } catch {
        backup[table] = [];
      }
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sme-accounting-backup-${dateStr}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
