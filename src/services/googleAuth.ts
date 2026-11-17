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
      return 'O administrador da sua conta Google (faculdade) bloqueou este app. Só a TI pode liberar o Client ID do EduTrack no painel de administração. Enquanto isso, use "Colar do Classroom".';
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
        const granted = Object.fromEntries(
          (Object.keys(CLASSROOM_SCOPES) as ClassroomScopeKey[]).map((k) => [
            k,
            Boolean(api.hasGrantedAllScopes(resp, CLASSROOM_SCOPES[k])),
          ])
        ) as Record<ClassroomScopeKey, boolean>;

        const missingRequired = REQUIRED_SCOPES.filter((k) => !granted[k]);
        if (missingRequired.length > 0) {
          revokeAccessToken(token);
          reject(
            new Error(
              `Para importar, marque na tela do Google as permissões: ${missingRequired.map((k) => SCOPE_LABELS[k]).join(' e ')}.`
            )
          );
          return;
        }
        const missingOptional = (Object.keys(CLASSROOM_SCOPES) as ClassroomScopeKey[])
          .filter((k) => !REQUIRED_SCOPES.includes(k) && !granted[k])
          .map((k) => SCOPE_LABELS[k]);
        resolve({ accessToken: token, granted, missingOptional });
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
    oauth2()?.revoke(token, () => {});
  } catch {
    // ignore: the token expires on its own in about an hour
  }
}
