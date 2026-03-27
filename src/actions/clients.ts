"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid, queryOne, softDelete } from "@/lib/db/client";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요").max(100, "거래처명은 100자 이내로 입력하세요"),
  business_number: z.string().regex(/^(\d{3}-\d{2}-\d{5})?$/, "사업자번호 형식: 000-00-00000").optional().or(z.literal("")),
  representative_name: z.string().max(50).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_email: z.string().email("올바른 이메일 형식을 입력하세요").optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  memo: z.string().max(500).optional(),
});

export async function createClientAction(formData: FormData) {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    business_number: formData.get("business_number") || undefined,
    representative_name: formData.get("representative_name") || undefined,
    contact_phone: formData.get("contact_phone") || undefined,
    contact_email: formData.get("contact_email") || undefined,
    address: formData.get("address") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    execute(
      `INSERT INTO clients (id, name, business_number, representative_name, contact_phone, contact_email, address, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(), parsed.data.name, parsed.data.business_number || null,
      parsed.data.representative_name || null, parsed.data.contact_phone || null,
      parsed.data.contact_email || null, parsed.data.address || null,
      parsed.data.memo || null
    );

    revalidatePath("/clients");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "거래처 등록에 실패했습니다." };
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    business_number: formData.get("business_number") || undefined,
    representative_name: formData.get("representative_name") || undefined,
    contact_phone: formData.get("contact_phone") || undefined,
    contact_email: formData.get("contact_email") || undefined,
    address: formData.get("address") || undefined,
    memo: formData.get("memo") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    execute(
      `UPDATE clients SET name = ?, business_number = ?, representative_name = ?, contact_phone = ?, contact_email = ?, address = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_deleted = 0`,
      parsed.data.name, parsed.data.business_number || null,
      parsed.data.representative_name || null, parsed.data.contact_phone || null,
      parsed.data.contact_email || null, parsed.data.address || null,
      parsed.data.memo || null, id
    );

    revalidatePath("/clients");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "거래처 수정에 실패했습니다." };
  }
}

export async function deleteClientAction(id: string) {
  try {
    // Check if client has related sales or purchases
    const hasSales = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM sales WHERE client_id = ? AND is_deleted = 0", id
    );
    const hasPurchases = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM purchases WHERE client_id = ? AND is_deleted = 0", id
    );

    if ((hasSales?.cnt || 0) > 0 || (hasPurchases?.cnt || 0) > 0) {
      return { error: "해당 거래처에 연결된 매출/매입이 있어 삭제할 수 없습니다." };
    }

    softDelete("clients", id);
    revalidatePath("/clients");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "거래처 삭제에 실패했습니다." };
  }
}
