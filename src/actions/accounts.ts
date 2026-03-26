"use server";

import { revalidatePath } from "next/cache";
import { queryAll, queryOne, execute, uuid } from "@/lib/db/client";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "계좌 이름을 입력하세요"),
  bank_name: z.string().min(1, "은행을 선택하세요"),
  account_number: z.string().optional(),
  account_type: z.string().default("checking"),
  initial_balance: z.number().default(0),
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

  execute(
    `UPDATE accounts SET name = ?, bank_name = ?, account_number = ?, account_type = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    parsed.data.name, parsed.data.bank_name, parsed.data.account_number || null,
    parsed.data.account_type, id
  );

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAccount(id: string) {
  execute("DELETE FROM accounts WHERE id = ?", id);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { success: true };
}
