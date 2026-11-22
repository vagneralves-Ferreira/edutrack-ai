export type SupabaseOtpType = 'recovery' | 'signup' | 'email';

export interface AuthRedirectInfo {
  hashParams: URLSearchParams;
  searchParams: URLSearchParams;
  authType: string | null;
  isRecovery: boolean;
  isSignupConfirmation: boolean;
  isRecoveryOtpExpired: boolean;
  otpType: SupabaseOtpType;
}

export function parseHashParams(hashStr: string): URLSearchParams {
  const cleaned = (hashStr || '').replace(/^#\/?/, '');
  const queryStart = cleaned.indexOf('?');
  if (queryStart !== -1) {
    return new URLSearchParams(cleaned.slice(queryStart + 1));
  }
  return new URLSearchParams(cleaned);
}

/**
 * Classifica o fluxo inicial de redirecionamento do Supabase Auth.
 * - `type=signup` NUNCA deve cair em recuperação de senha ("Alterar Minha Senha").
 * - `isRecovery` só é true quando `type=recovery` está na URL ou a rota explícita é `reset-password` (sem `type=signup`).
 */
export function parseAuthRedirect(pathname: string, search: string, hash: string): AuthRedirectInfo {
  const hashParams = parseHashParams(hash);
  const searchParams = new URLSearchParams(search || '');

  const rawType = (searchParams.get('type') || hashParams.get('type') || '').toLowerCase() || null;
  const isSignupConfirmation =
    rawType === 'signup' ||
    (search || '').toLowerCase().includes('type=signup') ||
    (hash || '').toLowerCase().includes('type=signup');

  const hasExplicitRecoveryType =
    rawType === 'recovery' ||
    (search || '').toLowerCase().includes('type=recovery') ||
    (hash || '').toLowerCase().includes('type=recovery');

  const isResetPasswordRoute =
    (pathname || '').includes('reset-password') || (hash || '').includes('reset-password');

  const isRecovery = !isSignupConfirmation && (hasExplicitRecoveryType || isResetPasswordRoute);

  const hasOtpExpired =
    (hash || '').includes('otp_expired') || (search || '').includes('otp_expired');
  const isRecoveryOtpExpired = isRecovery && hasOtpExpired;

  const otpType: SupabaseOtpType = isRecovery
    ? 'recovery'
    : isSignupConfirmation
      ? 'signup'
      : 'email';

  return {
    hashParams,
    searchParams,
    authType: rawType,
    isRecovery,
    isSignupConfirmation,
    isRecoveryOtpExpired,
    otpType,
  };
}
