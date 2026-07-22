export type Role = "student" | "educator" | "admin";
export type ContentType = "pdf" | "article" | "quiz" | "questionnaire";
export type ContentStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  points: number;
  streak: number;
  last_login: string | null;
  wallet_address: string | null;
  created_at: string;
}

export interface Conversion {
  id: string;
  user_id: string;
  points_spent: number;
  ptr_amount: number;
  wallet_address: string;
  status: "pending" | "minted" | "rejected";
  tx_hash: string | null;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  category: string | null;
  file_path: string | null;
  body: string | null;
  author_id: string;
  status: ContentStatus;
  created_at: string;
}

export interface Quiz {
  id: string;
  content_id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  content_id: string;
  question: string;
  kind: "text" | "choice";
  options: string[] | null;
  position: number;
}
