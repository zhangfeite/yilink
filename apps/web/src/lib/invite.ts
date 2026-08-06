function configuredInviteCodes(): Set<string> {
  return new Set(
    (process.env.INVITE_CODES ?? '')
      .split(',')
      .map((code) => code.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Whether this deployment requires an invitation code to create an account. */
export function isInviteRequired(): boolean {
  return Boolean(process.env.INVITE_CODES?.trim());
}

/**
 * Accepts a configured invitation code without persisting or exposing it.
 * When no code table is configured, self-hosted deployments remain open.
 */
export function validateInviteCode(code: unknown): boolean {
  if (!isInviteRequired()) {
    return true;
  }

  if (typeof code !== 'string') {
    return false;
  }

  const normalizedCode = code.trim().toLowerCase();
  return normalizedCode.length > 0 && configuredInviteCodes().has(normalizedCode);
}
