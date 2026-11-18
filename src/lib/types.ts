// Hand-written row types matching supabase/migrations. Replace with generated
// types (`supabase gen types typescript`) once the project is linked.

export type WalletType = "cash" | "debit" | "ewallet" | "savings";
export type TransactionType = "expense" | "income" | "transfer";

export type Profile = {
  id: string;
  display_name: string | null;
  currency: string;
  allowance_weekday: number | null;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  is_default: boolean;
};

export type WalletBalanceRow = {
  id: string;
  name: string;
  type: WalletType;
  counts_as_spendable: boolean;
  balance_cents: number;
};

export type TransactionRow = {
  id: string;
  type: TransactionType;
  amount_cents: number;
  merchant: string | null;
  note: string | null;
  occurred_at: string;
  wallet: { name: string } | null;
  to_wallet: { name: string } | null;
  category: { name: string; color: string } | null;
};

export type CategorySpend = {
  category_id: string | null;
  name: string;
  color: string;
  total_cents: number;
};

export type TransactionDetail = TransactionRow & {
  wallet_id: string;
  transfer_to_wallet_id: string | null;
  category_id: string | null;
};

export type Gig = {
  id: string;
  title: string;
  work_date: string; // YYYY-MM-DD
  hours: number | null;
  expected_cents: number;
  status: "pending" | "paid";
  paid_at: string | null;
  wallet_id: string | null;
  transaction_id: string | null;
  /** What actually arrived, from the linked income entry. */
  paid_cents: number | null;
  wallet_name: string | null;
};

export type Goal = {
  id: string;
  name: string;
  target_cents: number;
  saved_cents: number;
  target_date: string | null;
};
