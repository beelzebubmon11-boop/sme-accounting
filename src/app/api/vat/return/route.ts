import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const salesData = await queryOne<any>(
    `SELECT
      COALESCE(SUM(CASE WHEN tax_amount > 0 THEN supply_amount ELSE 0 END), 0) as taxable_sales,
      COALESCE(SUM(CASE WHEN tax_amount = 0 THEN supply_amount ELSE 0 END), 0) as exempt_sales,
      COALESCE(SUM(tax_amount), 0) as sales_tax
    FROM sales
    WHERE sale_date >= ? AND sale_date <= ? AND is_deleted = 0`,
    startDate,
    endDate
  );

  const purchaseData = await queryOne<any>(
    `SELECT COALESCE(SUM(tax_amount), 0) as purchase_tax
    FROM purchases
    WHERE purchase_date >= ? AND purchase_date <= ? AND is_deleted = 0`,
    startDate,
    endDate
  );

  const salesTax = salesData?.sales_tax || 0;
  const purchaseTax = purchaseData?.purchase_tax || 0;

  return NextResponse.json({
    taxableSales: salesData?.taxable_sales || 0,
    exemptSales: salesData?.exempt_sales || 0,
    salesTax,
    purchaseTax,
    taxPayable: salesTax - purchaseTax,
  });
}
