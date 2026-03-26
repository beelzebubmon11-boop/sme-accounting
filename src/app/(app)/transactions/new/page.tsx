import { redirect } from "next/navigation";

export default function TransactionNewPage() {
  redirect("/bank-transactions/new");
}
