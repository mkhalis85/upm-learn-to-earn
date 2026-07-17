export const ALLOWED_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || ""
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string): boolean {
  if (ALLOWED_DOMAINS.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

export const REASON_LABELS: Record<string, string> = {
  content_upload_approved: "Upload approved",
  content_completed: "Content completed",
  quiz_passed: "Quiz passed",
  daily_login: "Daily login",
};
