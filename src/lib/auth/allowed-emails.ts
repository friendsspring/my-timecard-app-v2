export function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAllowedEmails();
  if (allowed.size === 0) {
    return false;
  }
  return allowed.has(email.trim().toLowerCase());
}
