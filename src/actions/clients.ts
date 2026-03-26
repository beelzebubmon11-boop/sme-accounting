"use server";

import { revalidatePath } from "next/cache";
import { execute, uuid } from "@/lib/db/client";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요"),
  business_number: z.string().optional(),
  representative_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  memo: z.string().optional(),
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

  execute(
    `UPDATE clients SET name = ?, business_number = ?, representative_name = ?, contact_phone = ?, contact_email = ?, address = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    parsed.data.name, parsed.data.business_number || null,
    parsed.data.representative_name || null, parsed.data.contact_phone || null,
    parsed.data.contact_email || null, parsed.data.address || null,
    parsed.data.memo || null, id
  );

  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClientAction(id: string) {
  execute("DELETE FROM clients WHERE id = ?", id);
  revalidatePath("/clients");
  return { success: true };
}
