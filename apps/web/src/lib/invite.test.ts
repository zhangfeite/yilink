import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isInviteRequired, validateInviteCode } from './invite';

const originalInviteCodes = process.env.INVITE_CODES;

function restoreInviteCodes() {
  if (originalInviteCodes === undefined) {
    delete process.env.INVITE_CODES;
  } else {
    process.env.INVITE_CODES = originalInviteCodes;
  }
}

describe('invite validation', () => {
  beforeEach(() => {
    delete process.env.INVITE_CODES;
  });

  afterEach(restoreInviteCodes);

  it('keeps self-hosted registration open when no codes are configured', () => {
    expect(isInviteRequired()).toBe(false);
    expect(validateInviteCode(undefined)).toBe(true);
  });

  it('requires a code when the code table is configured', () => {
    process.env.INVITE_CODES = 'alpha';

    expect(isInviteRequired()).toBe(true);
    expect(validateInviteCode(undefined)).toBe(false);
  });

  it('rejects codes that are not in the configured table', () => {
    process.env.INVITE_CODES = 'alpha,beta';

    expect(validateInviteCode('gamma')).toBe(false);
  });

  it('trims configured and submitted codes and compares them case-insensitively', () => {
    process.env.INVITE_CODES = ' Alpha , BeTa ';

    expect(validateInviteCode('  beta  ')).toBe(true);
  });
});
