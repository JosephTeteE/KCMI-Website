/**
 * Visitor-facing registration reference codes: KCMI-XXXXXX (non-sequential).
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function generateRegistrationReferenceCode(
  randomBytes: (size: number) => Uint8Array = (size) => {
    const out = new Uint8Array(size);
    crypto.getRandomValues(out);
    return out;
  },
): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length]!;
  }
  return `KCMI-${code}`;
}

export function isRegistrationReferenceCode(value: string): boolean {
  return /^KCMI-[A-Z0-9]{6}$/.test(value);
}
