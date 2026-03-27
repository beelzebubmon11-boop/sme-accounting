"use server";

import { revalidatePath } from "next/cache";
import { queryOne, execute, uuid, softDelete } from "@/lib/db/client";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "계좌 이름을 입력하세요").max(50, "계좌 이름은 50자 이내로 입력하세요"),
  bank_name: z.string().min(1, "은행을 선택하세요"),
  account_number: z.string().max(30).optional(),
  account_type: z.enum(["checking", "savings", "deposit", "other"]).default("checking"),
  initial_balance: z.number().min(0, "초기 잔액은 0 이상이어야 합니다").default(0),
});

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    bank_name: formData.get("bank_name"),
    account_number: formData.get("account_number") || undefined,
    account_type: formData.get("account_type") || "checking",
    initial_balance: Number(formData.get("initial_balance")) || 0,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const id = uuid();
    execute(
      `INSERT INTO accounts (id, name, bank_name, account_number, account_type, initial_balance, current_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, parsed.data.name, parsed.data.bank_name, parsed.data.account_number || null,
      parsed.data.account_type, parsed.data.initial_balance, parsed.data.initial_balance
    );

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "계좌 등록에 실패했습니다." };
  }
}

export async function updateAccount(id: string, formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    bank_name: formData.get("bank_name"),
    account_number: formData.get("account_number") || undefined,
    account_type: formData.get("account_type") || "checking",
    initial_balance: Number(formData.get("initial_balance")) || 0,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    execute(
      `UPDATE accounts SET name = ?, bank_name = ?, account_number = ?, account_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_deleted = 0`,
      parsed.data.name, parsed.data.bank_name, parsed.data.account_number || null,
      parsed.data.account_type, id
    );

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "계좌 수정에 실패했습니다." };
  }
}

export async function deleteAccount(id: string) {
  try {
    // Check for related vouchers
    const hasVouchers = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM vouchers WHERE account_id = ? AND is_deleted = 0", id
    );
    if ((hasVouchers?.cnt || 0) > 0) {
      return { error: "해당 계좌에 연결된 전표가 있어 삭제할 수 없습니다." };
    }

    softDelete("accounts", id);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "계좌 삭제에 실패했습니다." };
  }
}
