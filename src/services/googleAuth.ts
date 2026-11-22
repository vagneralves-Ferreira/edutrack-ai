/**
 * "Entrar com Google" for the Classroom import, using Google Identity Services (token model) in the browser.
 *
 * The access token lives only in memory for the duration of one import: it is never written to Supabase,
 * localStorage or sessionStorage, and it is revoked as soon as the Classroom data has been read.
 */

/** Read-only scopes. The first two are required; the others enrich the import. */
export const CLASSROOM_SCOPES = {
  courses: 'https://www.googleapis.com/auth/classroom.courses.readonly',
  courseworkMe: 'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  materials: 'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  announcements: 'https://www.googleapis.com/auth/classroom.announcements.readonly',
  rosters: 'https://www.googleapis.com/auth/classroom.rosters.readonly',
} as const;

export type ClassroomScopeKey = keyof typeof CLASSROOM_SCOPES;

const REQUIRED_SCOPES: ClassroomScopeKey[] = ['courses', 'courseworkMe'];
const SCOPE_LABELS: Record<ClassroomScopeKey, string> = {
  courses: 'ver suas turmas',
  courseworkMe: 'ver atividades e suas entregas',
  materials: 'ver materiais',
  announcements: 'ver avisos do mural',
  rosters: 'ver nomes dos professores',
};

const SCOPE_PREFIX = 'https://www.googleapis.com/auth/';

/**
 * Names Google may report for the same Classroom permission. Google renamed the student-submissions scopes to
 * coursework.* but still returns (and shows in the Cloud console) the old names for some accounts/clients.
 * The read-write variant of a scope also covers the read-only one.
 */
const SCOPE_EQUIVALENTS: Record<ClassroomScopeKey, string[]> = {
  courses: ['classroom.courses.readonly', 'classroom.courses'],
  courseworkMe: [
    'classroom.coursework.me.readonly',
    'classroom.student-submissions.me.readonly',
    'classroom.coursework.me',
  ],
  materials: ['classroom.courseworkmaterials.readonly', 'classroom.courseworkmaterials'],
  announcements: ['classroom.announcements.readonly', 'classroom.announcements'],
  rosters: ['classroom.rosters.readonly', 'classroom.rosters'],
};

/** Other known old ↔ new aliases (not requested by the app, kept so the mapping is complete). */
const SCOPE_ALIASES: Record<string, string> = {
  'classroom.student-submissions.me.readonly': 'classroom.coursework.me.readonly',
  'classroom.student-submissions.students.readonly': 'classroom.coursework.students.readonly',
};

/** "https://www.googleapis.com/auth/classroom.x" → "classroom.x" (old names mapped to the current ones). */
export function normalizeScopeName(scope: string): string {
  const short = scope.trim().replace(SCOPE_PREFIX, '');
  return SCOPE_ALIASES[short] || short;
}

export function parseGrantedScopes(scopeString: string): string[] {
  return scopeString.split(/[\s,]+/).filter(Boolean);
}

/** Which of our permissions the returned scope list covers, accepting old names and broader scopes. */
export function grantsFromScopeList(scopes: string[]): Record<ClassroomScopeKey, boolean> {
  const normalized = new Set(scopes.map(normalizeScopeName));
  return Object.fromEntries(
    (Object.keys(SCOPE_EQUIVALENTS) as ClassroomScopeKey[]).map((k) => [
      k,
      SCOPE_EQUIVALENTS[k].some((name) => normalized.has(normalizeScopeName(name))),
    ])
  ) as Record<ClassroomScopeKey, boolean>;
}

/** Error that carries the scope list Google returned (no token), shown in the modal for diagnosis. */
export class GoogleScopeError extends Error {
  grantedScopes: string[];
  constructor(message: string, grantedScopes: string[]) {
    super(message);
    this.name = 'GoogleScopeError';
    this.grantedScopes = grantedScopes;
  }
}

function missingRequiredMessage(missing: ClassroomScopeKey[]): string {
  return `Para importar, marque na tela do Google as permissões: ${missing.map((k) => SCOPE_LABELS[k]).join(' e ')}.`;
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise: Promise<void> | null = null;

const oauth2 = (): any => (window as any).google?.accounts?.oauth2;

/** Public OAuth Client ID (not a secret) from VITE_GOOGLE_CLIENT_ID. */
export function getGoogleClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

export function isGoogleIdentityLoaded(): boolean {
  return !!oauth2();
}

/**
 * Loads the Google Identity Services script ahead of time (when the modal opens), so the sign-in popup can be
 * opened directly inside the click handler; opening it after an async load gets it blocked by the browser.
 */
export function loadGoogleIdentityServices(): Promise<void> {
  if (oauth2()) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      script.remove();
      reject(new Error('Não foi possível carregar o login do Google. Verifique sua conexão ou bloqueadores de anúncio e tente de novo.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

function describeOAuthError(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'Você não autorizou o acesso ao Google Classroom. Clique em "Entrar com Google" de novo e permita a leitura.';
    case 'admin_policy_enforced':
      return 'O administrador da sua conta institucional restringiu a conexão direta. Use a aba "Importar do Portal" para trazer suas disciplinas e prazos rapidamente.';
    case 'org_internal':
      return 'Este app está configurado como "Interno" de outra organização. Entre com a conta da mesma organização do projeto no Google Cloud.';
    case 'invalid_client':
    case 'unauthorized_client':
      return 'O Client ID do Google configurado no app é inválido. Confira VITE_GOOGLE_CLIENT_ID.';
    default:
      return `O Google recusou o login (${code}).`;
  }
}

export interface ClassroomAccess {
  accessToken: string;
  /** Scopes the user actually granted (they can untick optional ones on the consent screen). */
  granted: Record<ClassroomScopeKey, boolean>;
  /** Human-readable list of optional permissions the user did not grant. */
  missingOptional: string[];
}

/** How long to keep waiting for the token after GIS reports "popup_closed" (it may be a false alarm). */
export const POPUP_CLOSED_GRACE_MS = 2 * 60 * 1000;

export interface RequestClassroomAccessOptions {
  /** Abort to stop waiting (e.g. the user clicked "Cancelar"). */
  signal?: AbortSignal;
  /** Called when GIS reports popup_closed but we keep waiting for the token. */
  onPopupMaybeClosed?: () => void;
  graceMs?: number;
}

/**
 * Opens the Google consent popup and resolves with an in-memory access token.
 * Must be called synchronously from a click handler, after loadGoogleIdentityServices() has finished.
 *
 * GIS detects a closed popup by polling `window.closed`. Google's own pages send a Cross-Origin-Opener-Policy
 * header, which makes that check read "closed" while the popup is still open (e.g. on the "Google hasn't
 * verified this app" screen), so `popup_closed` fires by mistake. It is therefore NOT treated as final:
 * we keep waiting for the token callback and only fail if nothing arrives within `graceMs`.
 */
export function requestClassroomAccess(
  clientId: string,
  options: RequestClassroomAccessOptions = {}
): Promise<ClassroomAccess> {
  const api = oauth2();
  if (!api) {
    return Promise.reject(new Error('O login do Google ainda está carregando. Aguarde um instante e clique de novo.'));
  }
  if (!clientId) {
    return Promise.reject(new Error('O app ainda não tem o Client ID do Google configurado (VITE_GOOGLE_CLIENT_ID).'));
  }

  return new Promise<ClassroomAccess>((outerResolve, outerReject) => {
    let settled = false;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      settled = true;
      if (graceTimer) clearTimeout(graceTimer);
      options.signal?.removeEventListener('abort', onAbort);
    };
    const resolve = (value: ClassroomAccess) => {
      if (settled) {
        revokeAccessToken(value.accessToken); // arrived after we gave up: don't keep it
        return;
      }
      finish();
      outerResolve(value);
    };
    const reject = (err: Error) => {
      if (settled) return;
      finish();
      outerReject(err);
    };
    const onAbort = () => reject(new Error('Login com Google cancelado.'));
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    options.signal?.addEventListener('abort', onAbort);

    const client = api.initTokenClient({
      client_id: clientId,
      scope: Object.values(CLASSROOM_SCOPES).join(' '),
      callback: (resp: any) => {
        if (resp?.error) {
          reject(new Error(describeOAuthError(String(resp.error))));
          return;
        }
        const token = resp?.access_token;
        if (!token) {
          reject(new Error('O Google não devolveu um token de acesso. Tente de novo.'));
          return;
        }
        const outcome = accessFromGrantedScopes(token, String(resp?.scope || ''));
        if (outcome.ok) resolve(outcome.access);
        else reject(new GoogleScopeError(outcome.error, outcome.grantedScopes || []));
      },
      error_callback: (err: any) => {
        const type = String(err?.type || '');
        if (type === 'popup_failed_to_open') {
          reject(new Error('O navegador bloqueou a janela do Google. Permita pop-ups para este site e clique de novo.'));
        } else if (type === 'popup_closed') {
          // Possibly a false alarm (COOP): keep waiting for the token callback for a while.
          if (graceTimer || settled) return;
          options.onPopupMaybeClosed?.();
          graceTimer = setTimeout(
            () =>
              reject(
                new Error(
                  'Não recebemos a autorização do Google. Se a janela foi fechada antes de concluir, clique em "Entrar com Google" de novo. Se ela mostrou "Erro 400: origin_mismatch", este endereço ainda não está nas Origens JavaScript autorizadas do Client ID.'
                )
              ),
            options.graceMs ?? POPUP_CLOSED_GRACE_MS
          );
        } else {
          reject(new Error(`Falha no login do Google${type ? ` (${type})` : ''}.`));
        }
      },
    });
    // Always show the account chooser so the student can pick the faculty account.
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

/** Revokes the token at Google (best effort). Called right after the Classroom data has been read. */
export function revokeAccessToken(token: string): void {
  try {
    const api = oauth2();
    if (api) {
      api.revoke(token, () => {});
      return;
    }
    // Redirect flow: GIS may not be loaded; use the revoke endpoint directly.
    void fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(token)}`,
    }).catch(() => {});
  } catch {
    // ignore: the token expires on its own in about an hour
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Redirect flow (default). The popup flow above depends on the popup talking back to the opener, which Google's
// Cross-Origin-Opener-Policy can break in some Chrome setups; a full-page redirect does not.
// ---------------------------------------------------------------------------------------------------------------

export const OAUTH_CALLBACK_PATH = '/oauth-callback.html';
const PENDING_KEY = 'edutrack_google_oauth_pending';
const RESULT_KEY = 'edutrack_google_oauth_result';
/** Not a secret: only remembers that this browser already went through the consent screen once. */
const CONSENTED_KEY = 'edutrack_google_oauth_consented';
const REDIRECT_MAX_AGE_MS = 10 * 60 * 1000;

export function getOAuthRedirectUri(origin: string = window.location.origin): string {
  return `${origin}${OAUTH_CALLBACK_PATH}`;
}

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sends the whole page to Google's OAuth 2.0 endpoint (implicit flow, response_type=token).
 * Google comes back to /oauth-callback.html, which returns to the current hash route.
 */
export function startClassroomRedirect(clientId: string): void {
  if (!clientId) throw new Error('O app ainda não tem o Client ID do Google configurado (VITE_GOOGLE_CLIENT_ID).');
  const state = randomState();
  const returnTo = window.location.hash && window.location.hash.startsWith('#/') ? window.location.hash : '#/tarefas';
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, returnTo, createdAt: Date.now() }));
  sessionStorage.removeItem(RESULT_KEY);

  let consentedBefore = false;
  try {
    consentedBefore = localStorage.getItem(CONSENTED_KEY) === '1';
  } catch {
    consentedBefore = false;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(),
    response_type: 'token',
    scope: Object.values(CLASSROOM_SCOPES).join(' '),
    state,
    include_granted_scopes: 'true',
    // First time: show the consent screen; afterwards just let the student pick the account.
    prompt: consentedBefore ? 'select_account' : 'consent select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export function hasClassroomRedirectResult(): boolean {
  try {
    return sessionStorage.getItem(RESULT_KEY) !== null;
  } catch {
    return false;
  }
}

export type ClassroomRedirectOutcome =
  | { ok: true; access: ClassroomAccess }
  /** grantedScopes: what Google returned in `scope` (never the token), shown in the modal for diagnosis. */
  | { ok: false; error: string; grantedScopes?: string[] };

/** Turns the `scope` string Google returns into per-scope grants (required ones are checked). */
export function accessFromGrantedScopes(accessToken: string, scopeString: string): ClassroomRedirectOutcome {
  const grantedList = parseGrantedScopes(scopeString);
  const granted = grantsFromScopeList(grantedList);
  const missingRequired = REQUIRED_SCOPES.filter((k) => !granted[k]);
  if (missingRequired.length > 0) {
    revokeAccessToken(accessToken);
    return { ok: false, error: missingRequiredMessage(missingRequired), grantedScopes: grantedList };
  }
  const missingOptional = (Object.keys(CLASSROOM_SCOPES) as ClassroomScopeKey[])
    .filter((k) => !REQUIRED_SCOPES.includes(k) && !granted[k])
    .map((k) => SCOPE_LABELS[k]);
  return { ok: true, access: { accessToken, granted, missingOptional } };
}

/**
 * Reads what /oauth-callback.html left in sessionStorage, deletes it immediately, and validates it:
 * the `state` must match the one created before the redirect (CSRF protection) and be recent.
 * Returns null when there is nothing to process.
 */
export function consumeClassroomRedirectResult(): ClassroomRedirectOutcome | null {
  let rawResult: string | null = null;
  let rawPending: string | null = null;
  try {
    rawResult = sessionStorage.getItem(RESULT_KEY);
    rawPending = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(RESULT_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    return null;
  }
  if (rawResult === null) return null;

  let result: any = null;
  let pending: any = null;
  try {
    result = JSON.parse(rawResult);
    pending = rawPending ? JSON.parse(rawPending) : null;
  } catch {
    return { ok: false, error: 'Resposta do Google ilegível. Clique em "Entrar com Google" de novo.' };
  }

  const token: string | null = result?.access_token || null;
  const fail = (error: string): ClassroomRedirectOutcome => {
    if (token) revokeAccessToken(token);
    return { ok: false, error };
  };

  if (!pending?.state || !result?.state || pending.state !== result.state) {
    return fail('A resposta do Google não confere com o pedido feito por este navegador (state inválido). Por segurança, nada foi importado. Clique em "Entrar com Google" de novo.');
  }
  if (typeof pending.createdAt !== 'number' || Date.now() - pending.createdAt > REDIRECT_MAX_AGE_MS) {
    return fail('O login com o Google demorou demais e expirou. Clique em "Entrar com Google" de novo.');
  }
  if (result.error) return fail(describeOAuthError(String(result.error)));
  if (!token) return fail('O Google não devolveu um token de acesso. Tente de novo.');

  try {
    localStorage.setItem(CONSENTED_KEY, '1');
  } catch {
    // optional convenience only
  }
  return accessFromGrantedScopes(token, String(result.scope || ''));
}
