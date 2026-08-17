/** North American (NANP) phone formatting: (555) 123-4567 */

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function nanpCore(digits: string): string {
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** Complete 10-digit US/Canada number (optional leading country 1). */
export function isStandardNanp(value: string): boolean {
  const core = nanpCore(phoneDigits(value));
  return core.length === 10;
}

/**
 * Format as the user types. 10-digit (or 1 + 10) numbers become
 * `(555) 123-4567`. Other values are left mostly intact so unusual
 * numbers can still be saved.
 */
export function formatPhoneAsYouType(raw: string): string {
  if (!raw) return "";

  const plus = raw.trimStart().startsWith("+");
  const digits = phoneDigits(raw);
  if (!digits) return plus ? "+" : "";

  if (plus && !digits.startsWith("1")) {
    return `+${digits}`;
  }

  let prefix = "";
  let rest = digits;
  if (rest.startsWith("1") && rest.length > 10) {
    prefix = plus ? "+1 " : "1 ";
    rest = rest.slice(1);
  } else if (plus && rest.startsWith("1")) {
    prefix = rest.length > 1 ? "+1 " : "+1";
    rest = rest.slice(1);
  }

  const core = rest.slice(0, 10);
  const extra = rest.slice(10);

  let body = "";
  if (core.length === 0) body = "";
  else if (core.length < 4) body = `(${core}`;
  else if (core.length < 7) body = `(${core.slice(0, 3)}) ${core.slice(3)}`;
  else body = `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;

  return `${prefix}${body}${extra ? ` ${extra}` : ""}`.replace(/\s+$/, "");
}

/**
 * True when the value is non-empty and not a standard NANP number.
 * Incomplete numbers are not flagged until `committed` (blur).
 */
export function isUnusualPhone(value: string, committed = false): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isStandardNanp(trimmed)) return false;

  const digits = phoneDigits(trimmed);
  if (digits.length === 0) return true;

  const extra =
    digits.length > 11 || (digits.length > 10 && !digits.startsWith("1"));
  if (extra) return true;
  if (/[a-zA-Z]/.test(trimmed)) return true;

  return committed;
}

export const UNUSUAL_PHONE_NOTE =
  "Unusual format — you can still save this number.";
