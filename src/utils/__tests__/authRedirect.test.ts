import { describe, expect, it } from 'vitest';
import { parseAuthRedirect } from '../authRedirect';

describe('parseAuthRedirect', () => {
  it('nunca abre fluxo de recuperação para confirmação de cadastro (type=signup)', () => {
    const fromHash = parseAuthRedirect('/', '', '#access_token=abc&refresh_token=def&type=signup');
    expect(fromHash.isSignupConfirmation).toBe(true);
    expect(fromHash.isRecovery).toBe(false);
    expect(fromHash.otpType).toBe('signup');

    const fromQuery = parseAuthRedirect('/', '?token_hash=xyz&type=signup', '');
    expect(fromQuery.isSignupConfirmation).toBe(true);
    expect(fromQuery.isRecovery).toBe(false);
    expect(fromQuery.otpType).toBe('signup');

    const expiredSignup = parseAuthRedirect('/', '', '#error=access_denied&error_code=otp_expired&type=signup');
    expect(expiredSignup.isSignupConfirmation).toBe(true);
    expect(expiredSignup.isRecovery).toBe(false);
    expect(expiredSignup.isRecoveryOtpExpired).toBe(false);
  });

  it('ativa fluxo de recuperação somente quando type=recovery ou rota /reset-password', () => {
    const recoveryHash = parseAuthRedirect('/', '', '#access_token=abc&refresh_token=def&type=recovery');
    expect(recoveryHash.isRecovery).toBe(true);
    expect(recoveryHash.isSignupConfirmation).toBe(false);
    expect(recoveryHash.otpType).toBe('recovery');

    const recoveryQuery = parseAuthRedirect('/reset-password', '?token_hash=xyz&type=recovery', '');
    expect(recoveryQuery.isRecovery).toBe(true);
    expect(recoveryQuery.otpType).toBe('recovery');

    const expiredRecovery = parseAuthRedirect('/reset-password', '', '#error_code=otp_expired&type=recovery');
    expect(expiredRecovery.isRecovery).toBe(true);
    expect(expiredRecovery.isRecoveryOtpExpired).toBe(true);
  });

  it('não ativa recuperação para URLs normais nem otp_expired sem type=recovery', () => {
    const normal = parseAuthRedirect('/', '', '#/dashboard');
    expect(normal.isRecovery).toBe(false);
    expect(normal.isSignupConfirmation).toBe(false);

    const genericExpired = parseAuthRedirect('/', '', '#error=access_denied&error_code=otp_expired');
    expect(genericExpired.isRecovery).toBe(false);
    expect(genericExpired.isRecoveryOtpExpired).toBe(false);
  });
});
