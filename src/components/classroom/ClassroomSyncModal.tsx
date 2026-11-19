import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookMarked,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  KeyRound,
  FileJson,
  ExternalLink,
  AlertTriangle,
  Layers,
  BookOpen,
  CheckSquare,
  FileText,
  GraduationCap,
  Copy,
  Check,
  Link2,
} from 'lucide-react';
import { usePlanner, type CourseResolution, type ClassroomApplySummary } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchGoogleClassroomFullData,
  fetchGoogleAppsScriptClassroom,
  buildAppsScriptCode,
  generateAppsScriptToken,
  parseClassroomPastedContent,
  type ClassroomSyncResult,
} from '../../services/classroomSync';
import { autoResolveCourse } from '../../services/classroomImport';
import {
  consumeClassroomRedirectResult,
  GoogleScopeError,
  getGoogleClientId,
  hasClassroomRedirectResult,
  isGoogleIdentityLoaded,
  loadGoogleIdentityServices,
  requestClassroomAccess,
  revokeAccessToken,
  startClassroomRedirect,
  type ClassroomAccess,
} from '../../services/googleAuth';
import type { Subject } from '../../types';

function describeSummary(summary: ClassroomApplySummary): string {
  const parts = [
    `${summary.inserted} nova(s) atividade(s)`,
    `${summary.updated} já existente(s) atualizada(s), sem duplicar`,
  ];
  if (summary.subjectsCreated > 0) parts.push(`${summary.subjectsCreated} disciplina(s) criada(s)`);
  if (summary.ignoredCourses > 0) {
    parts.push(`${summary.ignoredCourses} turma(s) ignorada(s) (${summary.skippedTasks} atividade(s) não importada(s))`);
  }
  return `Importação concluída: ${parts.join(' • ')}.`;
}

/** Removes OAuth tokens/client ids that older versions of this modal saved in localStorage. */
function purgeLegacyGoogleStorage() {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('edutrack_google_classroom_token_') || key.startsWith('edutrack_google_client_id_'))) {
        stale.push(key);
      }
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing to clean
  }
}

export const ClassroomSyncModal: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || null;
  const {
    isClassroomModalOpen,
    setIsClassroomModalOpen,
    subjects,
    applyClassroomSyncResult,
    lastClassroomSync,
    isPlannerReady,
    tasks,
    ignoredCourses,
    restoreIgnoredCourse,
  } = usePlanner();
  // Always-current values for async flows (the redirect import starts right after a page load, before the
  // subjects have been read from Supabase; closures from that first render would see an empty list).
  const latestRef = useRef({ subjects, tasks, ignoredCourses, apply: applyClassroomSyncResult, ready: isPlannerReady });
  latestRef.current = { subjects, tasks, ignoredCourses, apply: applyClassroomSyncResult, ready: isPlannerReady };
  const ignoredCourseNames = [...new Set(ignoredCourses.map((c) => c.courseName))];

  const [activeMode, setActiveMode] = useState<'apps_script' | 'paste_import' | 'google_api'>('google_api');
  const [googleReady, setGoogleReady] = useState<boolean>(() => isGoogleIdentityLoaded());
  const [googleLoadError, setGoogleLoadError] = useState<string | null>(null);
  const googleClientId = getGoogleClientId();
  /** Lets the user stop waiting for the Google popup (e.g. after really closing it). */
  const googleAbortRef = useRef<AbortController | null>(null);
  const [awaitingGoogle, setAwaitingGoogle] = useState<boolean>(false);
  /** Result waiting for the "Turmas novas" review (classes that match no registered subject). */
  const [pendingResult, setPendingResult] = useState<ClassroomSyncResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, CourseResolution>>({});
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(
    () => (userId ? localStorage.getItem(`edutrack_apps_script_url_${userId}`) || '' : '')
  );
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  // Secret the Apps Script checks before answering. Kept only in this browser, like the script URL.
  const [scriptToken, setScriptToken] = useState<string>(
    () => (userId ? localStorage.getItem(`edutrack_apps_script_token_${userId}`) || '' : '')
  );
  const [showToken, setShowToken] = useState<boolean>(false);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Scopes Google returned (never the token), shown only together with the error they explain.
  const [errorScopes, setErrorScopes] = useState<{ forError: string; scopes: string[] } | null>(null);
  const showScopeError = (message: string, scopes: string[] | undefined) => {
    setErrorMsg(message);
    setErrorScopes(scopes ? { forError: message, scopes } : null);
  };
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncDiagnostic, setSyncDiagnostic] = useState<string | null>(null);

  useEffect(() => {
    setAppsScriptUrl(userId ? localStorage.getItem(`edutrack_apps_script_url_${userId}`) || '' : '');
    setScriptToken(userId ? localStorage.getItem(`edutrack_apps_script_token_${userId}`) || '' : '');
    setShowToken(false);
    setWarnMsg(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingResult(null);
    setResolutions({});
  }, [userId]);

  useEffect(() => {
    purgeLegacyGoogleStorage();
  }, []);

  // Back from Google (redirect flow): validate and consume the result once the user session is known,
  // reopen the modal and continue the import with the in-memory token.
  const runGoogleImportRef = useRef<((access: ClassroomAccess) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!userId || !hasClassroomRedirectResult()) return;
    const outcome = consumeClassroomRedirectResult();
    if (!outcome) return;
    setActiveMode('google_api');
    setIsClassroomModalOpen(true);
    if (!outcome.ok) {
      showScopeError(outcome.error, outcome.grantedScopes);
      return;
    }
    void runGoogleImportRef.current?.(outcome.access);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load Google Identity Services as soon as the modal opens, so the popup opens directly on click.
  useEffect(() => {
    if (!isClassroomModalOpen || !googleClientId) return;
    let alive = true;
    loadGoogleIdentityServices()
      .then(() => {
        if (alive) {
          setGoogleReady(true);
          setGoogleLoadError(null);
        }
      })
      .catch((err: Error) => {
        if (alive) setGoogleLoadError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [isClassroomModalOpen, googleClientId]);

  const countTasks = (result: ClassroomSyncResult, draftId: string) =>
    result.tasks.filter((t) => t.subjectId === draftId).length;

  /** Same rules as the import: linked (by activities or name), previously ignored, or new (→ review). */
  const autoMatches = (result: ClassroomSyncResult) => {
    const { subjects: subs, tasks: currentTasks, ignoredCourses: ignored } = latestRef.current;
    const ignoredKeys = new Set(ignored.map((c) => c.courseKey));
    return result.subjects.map((draft) => {
      const auto = autoResolveCourse(draft, subs, currentTasks, ignoredKeys);
      return {
        draft,
        match: (auto?.kind === 'link' ? auto.subject : null) as Subject | null,
        ignored: auto?.kind === 'ignored',
      };
    });
  };
  const isNewCourse = (m: { match: Subject | null; ignored: boolean }) => !m.match && !m.ignored;

  const handleRestoreIgnored = async (courseName: string) => {
    setErrorMsg(null);
    try {
      await restoreIgnoredCourse(courseName);
      setSuccessMsg(`A turma "${courseName}" volta a aparecer na próxima sincronização (em "Turmas novas").`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível voltar a importar a turma.');
    }
  };

  /** Writes the result; throws are shown in the modal. */
  const runApply = async (result: ClassroomSyncResult, chosen: Record<string, CourseResolution>) => {
    setIsLoading(true);
    setStepStatus('Salvando atividades no Supabase (sem duplicar)...');
    try {
      const summary = await latestRef.current.apply(result, chosen);
      setPendingResult(null);
      setResolutions({});
      setSuccessMsg(describeSummary(summary));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar as atividades do Classroom.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Classes that match a registered subject are linked automatically. If any class is new, stop and show the
   * "Turmas novas" review (default: create the subject) before writing anything.
   */
  const processResult = async (result: ClassroomSyncResult) => {
    const matches = autoMatches(result);
    const unmatched = matches.filter(isNewCourse);
    const linkedCount = matches.filter((m) => m.match).length;
    const ignoredCount = matches.filter((m) => m.ignored).length;
    const statesMap = result.courseStates || {};
    const courseNames = result.subjects
      .map((s) => `${s.name}${statesMap[s.id] ? ` [${statesMap[s.id]}]` : ''}`)
      .join(', ');
    setSyncDiagnostic(
      `API Classroom: ${result.subjects.length} turma(s) retornada(s)${courseNames ? ` (${courseNames})` : ''} | ${unmatched.length} nova(s) | ${linkedCount} já vinculada(s) | ${ignoredCount} ignorada(s)`
    );
    if (unmatched.length === 0) {
      await runApply(result, {});
      return;
    }
    const defaults: Record<string, CourseResolution> = {};
    for (const { draft } of unmatched) {
      const state = statesMap[draft.id];
      defaults[draft.id] = state === 'ARCHIVED' ? { action: 'ignore' } : { action: 'create' };
    }
    setResolutions(defaults);
    setPendingResult(result);
    setIsLoading(false);
  };

  const handleResolutionChange = (draftId: string, value: string) => {
    const next: CourseResolution =
      value === 'create' ? { action: 'create' } : value === 'ignore' ? { action: 'ignore' } : { action: 'link', subjectId: value };
    setResolutions((prev) => ({ ...prev, [draftId]: next }));
  };

  const resolutionValue = (r?: CourseResolution) =>
    !r || r.action === 'create' ? 'create' : r.action === 'ignore' ? 'ignore' : r.subjectId;

  const saveScriptToken = (value: string) => {
    setScriptToken(value);
    if (userId) {
      try {
        if (value) localStorage.setItem(`edutrack_apps_script_token_${userId}`, value);
        else localStorage.removeItem(`edutrack_apps_script_token_${userId}`);
      } catch {
        // storage unavailable: the token still works for this session
      }
    }
  };

  const handleGenerateToken = () => {
    if (
      scriptToken &&
      !window.confirm(
        'Gerar um novo token invalida o atual. Depois será preciso copiar o script de novo, colar no Apps Script e publicar uma nova versão. Continuar?'
      )
    ) {
      return;
    }
    saveScriptToken(generateAppsScriptToken());
    setCopiedScript(false);
  };

  const handleCopyAppsScript = async () => {
    setErrorMsg(null);
    // Copying without a token would hand out a script that rejects every request: create one first.
    const token = scriptToken || generateAppsScriptToken();
    if (!scriptToken) saveScriptToken(token);
    try {
      await navigator.clipboard.writeText(buildAppsScriptCode(token));
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      setShowToken(true);
      setErrorMsg('Não foi possível copiar automaticamente. Selecione e copie o script manualmente abaixo (o token já está nele).');
    }
  };

  const handleAppsScriptSync = async () => {
    const cleanUrl = appsScriptUrl.trim();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!cleanUrl || !cleanUrl.includes('script.google.com')) {
      setErrorMsg(
        'Cole a URL do Web App gerada no Google Apps Script (ela começa com https://script.google.com/macros/s/.../exec).'
      );
      return;
    }

    setIsLoading(true);
    setStepStatus('Buscando todas as turmas, entregas e professores diretamente da sua conta Google Classroom...');

    try {
      if (userId) localStorage.setItem(`edutrack_apps_script_url_${userId}`, cleanUrl);
      const result = await fetchGoogleAppsScriptClassroom(cleanUrl, scriptToken);
      setWarnMsg(
        result.scriptProtected === false
          ? 'Seu script está ABERTO: qualquer pessoa com a URL consegue ler seu Classroom. Clique em "Copiar Script" (ele já leva o token), cole no Apps Script e publique em Implantar → Gerenciar implantações → Editar → Nova versão.'
          : null
      );
      await processResult(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Erro ao conectar com o Web App do Google Apps Script.');
    }
  };

  /**
   * Reads Classroom with an in-memory token, revokes it right away, then follows the usual review + upsert
   * path. Shared by the redirect flow (default) and the popup flow. The token is never stored.
   */
  const runGoogleImport = async (access: ClassroomAccess) => {
    let token: string | null = access.accessToken;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      setStepStatus('Autorizado! Lendo turmas...');
      const result = await fetchGoogleClassroomFullData(
        token,
        {
          materials: access.granted.materials,
          announcements: access.granted.announcements,
          rosters: access.granted.rosters,
        },
        setStepStatus
      );
      setStepStatus(`${result.stats.coursesCount} turma(s) e ${result.stats.tasksCount} atividade(s) lidas. Preparando importação...`);
      // Data is in memory now: give the token back to Google before writing anything.
      revokeAccessToken(token);
      token = null;

      const warnings = [...(result.warnings || [])];
      if (access.missingOptional.length > 0) {
        warnings.push(`Permissões não concedidas: ${access.missingOptional.join(', ')}. Essas informações ficaram de fora.`);
      }
      setWarnMsg(warnings.length > 0 ? warnings.join(' ') : null);
      // Wait until the user's subjects are loaded, so classes are matched against the real list.
      if (!latestRef.current.ready) {
        setStepStatus('Carregando suas disciplinas para vincular as turmas...');
        const started = Date.now();
        while (!latestRef.current.ready && Date.now() - started < 20000) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      await processResult(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Não foi possível importar do Google Classroom.');
    } finally {
      if (token) revokeAccessToken(token);
    }
  };
  runGoogleImportRef.current = runGoogleImport;

  /** Default: full-page redirect to Google's OAuth 2.0 endpoint; comes back through /oauth-callback.html. */
  const handleGoogleRedirect = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setWarnMsg(null);
    if (!googleClientId) {
      setErrorMsg('O login com Google ainda não foi configurado neste ambiente (falta VITE_GOOGLE_CLIENT_ID).');
      return;
    }
    try {
      setIsLoading(true);
      setStepStatus('Redirecionando para o Google...');
      startClassroomRedirect(googleClientId);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Não foi possível iniciar o login com o Google.');
    }
  };

  /** Alternative: consent in a popup (must stay synchronous inside the click so it is not blocked). */
  const handleGooglePopup = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setWarnMsg(null);

    if (!googleClientId) {
      setErrorMsg('O login com Google ainda não foi configurado neste ambiente (falta VITE_GOOGLE_CLIENT_ID).');
      return;
    }
    if (!googleReady) {
      setErrorMsg(googleLoadError || 'O login do Google ainda está carregando. Aguarde um instante e clique de novo.');
      return;
    }

    setIsLoading(true);
    setStepStatus('Aguardando autorização no Google... Conclua as etapas na janela que abriu.');
    const controller = new AbortController();
    googleAbortRef.current = controller;
    setAwaitingGoogle(true);
    const accessPromise = requestClassroomAccess(googleClientId, {
      signal: controller.signal,
      onPopupMaybeClosed: () =>
        setStepStatus(
          'Aguardando autorização no Google... Se a janela ainda estiver aberta (por exemplo em "O Google não verificou este app"), continue por lá. Se você a fechou, clique em Cancelar.'
        ),
    });

    void (async () => {
      try {
        const access = await accessPromise;
        setAwaitingGoogle(false);
        googleAbortRef.current = null;
        await runGoogleImport(access);
      } catch (err: any) {
        setIsLoading(false);
        if (!controller.signal.aborted) {
          showScopeError(
            err?.message || 'Não foi possível importar do Google Classroom.',
            err instanceof GoogleScopeError ? err.grantedScopes : undefined
          );
        }
      } finally {
        setAwaitingGoogle(false);
        if (googleAbortRef.current === controller) googleAbortRef.current = null;
      }
    })();
  };

  const handlePasteOrJsonImport = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setIsLoading(true);
      setStepStatus('Analisando atividades, turmas e prazos informados...');
      const result = parseClassroomPastedContent(pastedText, subjects);
      await processResult(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Erro ao processar os dados informados.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPastedText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  if (!isClassroomModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bento-card w-full max-w-2xl rounded-3xl border border-violet-500/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="classroom-modal-header px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-[#10111a] to-violet-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Central de Conexão Google Classroom
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[10px] font-bold text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="ml-0.5">Workspace</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vincule todas as turmas, atividades, materiais de aula, avisos do mural e notas ao EduTrack AI
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setIsClassroomModalOpen(false)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Last Sync Status Bar */}
        {lastClassroomSync && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Última sincronização: {lastClassroomSync.timestamp} ({lastClassroomSync.coursesCount} turmas •{' '}
                {lastClassroomSync.tasksCount} atividades • {lastClassroomSync.materialsCount} materiais)
              </span>
            </div>
            <span className="text-emerald-400/80 font-mono uppercase">Sincronizado</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2 border-b border-white/[0.06]" role="tablist">
          {(
            [
              { mode: 'google_api', label: '1. Entrar com Google', Icon: KeyRound },
              { mode: 'paste_import', label: '2. Colar do Classroom (Ctrl+A)', Icon: FileJson },
              { mode: 'apps_script', label: '3. Apps Script (contas pessoais)', Icon: Link2 },
            ] as const
          ).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={activeMode === mode}
              onClick={() => {
                setActiveMode(mode);
                setErrorMsg(null);
                setWarnMsg(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === mode
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {pendingResult && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3" data-testid="classroom-review">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Turmas novas ({autoMatches(pendingResult).filter(isNewCourse).length})
                </h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Estas turmas do Classroom não correspondem a nenhuma disciplina cadastrada. Escolha o que fazer com
                  cada uma antes de importar.
                </p>
              </div>

              <ul className="space-y-2">
                {autoMatches(pendingResult)
                  .filter(isNewCourse)
                  .map(({ draft }) => (
                    <li
                      key={draft.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white truncate">{draft.name}</p>
                          {pendingResult.courseStates?.[draft.id] && pendingResult.courseStates[draft.id] !== 'ACTIVE' && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-300 shrink-0">
                              {pendingResult.courseStates[draft.id]}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{countTasks(pendingResult, draft.id)} atividade(s)</p>
                      </div>
                      <select
                        aria-label={`O que fazer com a turma ${draft.name}`}
                        value={resolutionValue(resolutions[draft.id])}
                        onChange={(e) => handleResolutionChange(draft.id, e.target.value)}
                        className="sm:w-64 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="create">Criar disciplina</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            Vincular a {s.name}
                          </option>
                        ))}
                        <option value="ignore">Ignorar</option>
                      </select>
                    </li>
                  ))}
              </ul>

              {autoMatches(pendingResult).some((m) => m.match) && (
                <div className="text-[11px] text-slate-400">
                  <p className="font-semibold text-slate-300">Vinculadas automaticamente:</p>
                  <ul className="mt-1 space-y-0.5">
                    {autoMatches(pendingResult)
                      .filter((m) => m.match)
                      .map(({ draft, match }) => (
                        <li key={draft.id}>
                          {draft.name} → {match!.name} ({countTasks(pendingResult, draft.id)} atividade(s))
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {autoMatches(pendingResult).some((m) => m.ignored) && (
                <div className="text-[11px] text-slate-400">
                  <p className="font-semibold text-slate-300">Ignoradas (você excluiu ou ignorou antes):</p>
                  <ul className="mt-1 space-y-0.5">
                    {autoMatches(pendingResult)
                      .filter((m) => m.ignored)
                      .map(({ draft }) => (
                        <li key={draft.id}>
                          {draft.name} ({countTasks(pendingResult, draft.id)} atividade(s) não importada(s))
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => runApply(pendingResult, resolutions)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importar atividades</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setPendingResult(null);
                    setResolutions({});
                  }}
                  className="sm:w-40 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!pendingResult && activeMode === 'apps_script' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    Conector Real da Sua Conta Google Classroom (Sem Client ID)
                  </h4>
                  <a
                    href="https://script.google.com/home/start"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    <span>Abrir Google Apps Script</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Por segurança do Google, nenhum site externo enxerga sua conta particular automaticamente. Com este conector oficial do Google (feito em 1 minuto na sua conta), você puxa <strong>todas as turmas, os professores reais (ex: Prof. Evandro) e todas as 15+ entregas de cada matéria</strong> direto do Classroom:
                </p>
                <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside">
                  <li>
                    Clique em <strong>Copiar Script</strong> abaixo e abra o{' '}
                    <a href="https://script.google.com/home/start" target="_blank" rel="noreferrer" className="text-cyan-300 underline">
                      script.google.com
                    </a>{' '}
                    com seu e-mail do <strong>Google Classroom</strong> (acadêmico ou pessoal) → <em>Novo projeto</em>.
                  </li>
                  <li>
                    Cole o código no editor, clique em <strong>Serviços (+)</strong> à esquerda → adicione <strong>Google Classroom API</strong>.
                  </li>
                  <li>
                    Clique em <strong>Implantar → Nova implantação → App da Web</strong> (<em>Executar como: Eu</em>, <em>Quem pode acessar: Qualquer pessoa</em>), autorize e cole a URL gerada abaixo.
                    Se já tinha um script, use <strong>Gerenciar implantações → Editar → Nova versão</strong> para manter a mesma URL.
                  </li>
                </ol>

                <div className="p-3 rounded-xl bg-black/25 border border-white/[0.08] space-y-2" data-testid="apps-script-token">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="apps-script-token" className="text-xs font-bold text-slate-200">
                      Token secreto do script
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      <span>{scriptToken ? 'Gerar novo token' : 'Gerar token'}</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="apps-script-token"
                      type={showToken ? 'text' : 'password'}
                      value={scriptToken}
                      onChange={(e) => saveScriptToken(e.target.value.trim())}
                      placeholder="Clique em Gerar token (ou cole aqui o token de outro dispositivo)"
                      autoComplete="off"
                      spellCheck={false}
                      className="flex-1 min-w-0 bg-black/40 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      {showToken ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A URL precisa ficar aberta para "Qualquer pessoa", então o script só responde a quem enviar este token.
                    Ele fica salvo apenas neste navegador e vai dentro do script copiado.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Código para colar no Apps Script (já com o seu token):</span>
                  <button
                    type="button"
                    onClick={handleCopyAppsScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-300" />}
                    <span>{copiedScript ? 'Script Copiado!' : 'Copiar Script'}</span>
                  </button>
                </div>

                <pre className="max-h-28 overflow-auto rounded-xl bg-black/50 border border-white/[0.08] p-2.5 text-[10px] text-slate-300 font-mono select-all">
                  {buildAppsScriptCode(
                    scriptToken ? (showToken ? scriptToken : '•'.repeat(12)) : '(clique em Gerar token)'
                  )}
                </pre>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-200">
                    URL do Web App do Apps Script:
                  </label>
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-black/40 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleAppsScriptSync}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Meu Classroom Real Agora</span>
                </button>
              </div>
            </div>
          )}

          {!pendingResult && activeMode === 'google_api' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3" data-testid="google-signin-panel">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                  Conexão oficial com o Google Classroom
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Entre com a conta do Google em que você usa o Classroom (por exemplo, a da faculdade). O EduTrack pede
                  <strong> só permissões de leitura</strong>:
                </p>
                <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                  <li>suas turmas e os nomes dos professores;</li>
                  <li>atividades e as suas entregas;</li>
                  <li>materiais e avisos do mural.</li>
                </ul>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O acesso é usado apenas durante a importação e cancelado logo em seguida: nada fica salvo no navegador
                  nem no banco. Enquanto o app estiver em modo de teste no Google, pode aparecer "O Google não verificou
                  este app": clique em <em>Avançado</em> → <em>Acessar EduTrack AI</em>.
                </p>

                {!googleClientId && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                    O login com Google ainda não foi configurado neste ambiente (falta <code>VITE_GOOGLE_CLIENT_ID</code>).
                    Enquanto isso, use "Colar do Classroom".
                  </div>
                )}
                <button
                  type="button"
                  disabled={isLoading || !googleClientId}
                  onClick={handleGoogleRedirect}
                  className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <svg aria-hidden="true" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
                  </svg>
                  <span>{isLoading ? 'Importando do Google Classroom...' : 'Entrar com Google'}</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Você vai para a página do Google e volta para cá automaticamente.
                </p>

                {googleClientId && (
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      disabled={isLoading || !googleReady}
                      onClick={handleGooglePopup}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline underline-offset-4 disabled:opacity-60 disabled:no-underline cursor-pointer"
                    >
                      {googleReady ? 'Alternativa: entrar em uma janela pop-up' : googleLoadError ? 'Pop-up indisponível' : 'Carregando opção de pop-up...'}
                    </button>
                    {googleLoadError && <p className="mt-1 text-[11px] text-rose-300">{googleLoadError}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {!pendingResult && activeMode === 'paste_import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200">
                    Modo Rápido (10 segundos): Copie sua página do Google Classroom ou envie um JSON
                  </label>
                  <label className="px-3 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-[11px] font-bold text-violet-300 cursor-pointer">
                    Carregar Arquivo .JSON
                    <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside bg-black/25 rounded-xl p-3 border border-white/[0.05]">
                  <li>Abra a aba <strong>Atividades</strong> da disciplina no Google Classroom (ex: Innovation Lab) ou a tela <strong>Pendentes / Concluídas</strong>.</li>
                  <li>Pressione <strong>Ctrl + A</strong> (selecionar tudo) e depois <strong>Ctrl + C</strong> (copiar).</li>
                  <li>Clique na caixa abaixo, pressione <strong>Ctrl + V</strong> e clique em <strong>Processar e Abastecer</strong>.</li>
                </ol>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Abra seu Google Classroom -> Atividades ou Pendentes -> copie (Ctrl+C) e cole (Ctrl+V) aqui..."
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePasteOrJsonImport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Processar e Abastecer EduTrack AI</span>
                </button>
              </div>
            </div>
          )}

          {/* Progress Status */}
          {isLoading && (
            <div
              role="status"
              aria-live="polite"
              data-testid="classroom-status"
              className="p-4 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center gap-3 text-xs text-violet-200"
            >
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span className="flex-1">{stepStatus}</span>
              {awaitingGoogle && (
                <button
                  type="button"
                  onClick={() => googleAbortRef.current?.abort()}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          )}

          {/* Warnings: open Apps Script, classes that could not be read, permissions not granted */}
          {warnMsg && (
            <div
              role="alert"
              data-testid="classroom-warning"
              className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-300"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{warnMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="min-w-0">
                <span>{errorMsg}</span>
                {errorScopes && errorScopes.forError === errorMsg && (
                  <div className="mt-2" data-testid="classroom-error-scopes">
                    <p className="font-semibold">
                      Permissões que o Google devolveu ({errorScopes.scopes.length}):
                    </p>
                    {errorScopes.scopes.length === 0 ? (
                      <p className="opacity-80">(nenhuma)</p>
                    ) : (
                      <ul className="mt-1 space-y-0.5 font-mono text-[11px] break-all">
                        {errorScopes.scopes.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Diagnostic summary of Classroom API return */}
          {syncDiagnostic && (
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-slate-300 break-words">
              {syncDiagnostic}
            </div>
          )}

          {/* Classes the student deleted/ignored: skipped by every sync until restored here */}
          {!pendingResult && ignoredCourseNames.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2" data-testid="ignored-courses">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Turmas ignoradas ({ignoredCourseNames.length})
              </p>
              <p className="text-[11px] text-slate-400">
                Não são importadas nas sincronizações. Clique em "Voltar a importar" para que apareçam de novo em "Turmas novas".
              </p>
              <ul className="space-y-1.5">
                {ignoredCourseNames.map((name) => (
                  <li key={name} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                    <span className="truncate">{name}</span>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleRestoreIgnored(name)}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-semibold text-slate-200 cursor-pointer disabled:opacity-50"
                    >
                      Voltar a importar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
