import { NextRequest, NextResponse } from "next/server";
import { execute, runTransaction, createVoucher } from "@/lib/db/client";

function getAccumAccount(assetCode: string): { code: string; name: string } {
  const mapping: Record<string, { code: string; name: string }> = {
    "201": { code: "210", name: "건물감가상각누계액" },
    "202": { code: "211", name: "차량감가상각누계액" },
    "203": { code: "212", name: "비품감가상각누계액" },
  };
  return mapping[assetCode] || { code: "212", name: "비품감가상각누계액" };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assets } = body as {
      assets: { id: string; name: string; account_code: string; monthlyDepreciation: number }[];
    };

    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "상각 대상 자산이 없습니다." }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    await runTransaction(async () => {
      for (const asset of assets) {
        const accum = getAccumAccount(asset.account_code);

        await createVoucher({
          voucherType: "general",
          voucherDate: today,
          description: `감가상각비 - ${asset.name}`,
          lines: [
            {
              accountCode: "820",
              accountName: "감가상각비",
              debitAmount: asset.monthlyDepreciation,
              creditAmount: 0,
              description: `${asset.name} 월 감가상각`,
            },
            {
              accountCode: accum.code,
              accountName: accum.name,
              debitAmount: 0,
              creditAmount: asset.monthlyDepreciation,
              description: `${asset.name} 감가상각누계액`,
            },
          ],
        });

        // Update asset records
        await execute(
          `UPDATE fixed_assets SET
            accumulated_depreciation = accumulated_depreciation + ?,
            book_value = book_value - ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          asset.monthlyDepreciation,
          asset.monthlyDepreciation,
          asset.id
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
