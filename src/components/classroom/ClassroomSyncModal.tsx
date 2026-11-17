import React, { useState, useEffect } from 'react';
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
import { findMatchingSubject } from '../../services/classroomImport';
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

const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
].join(' ');

export const ClassroomSyncModal: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || null;
  const {
    isClassroomModalOpen,
    setIsClassroomModalOpen,
    subjects,
    applyClassroomSyncResult,
    lastClassroomSync,
  } = usePlanner();

  const [activeMode, setActiveMode] = useState<'apps_script' | 'paste_import' | 'google_api'>('apps_script');
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
  const [accessToken, setAccessToken] = useState<string>(
    () => (userId ? localStorage.getItem(`edutrack_google_classroom_token_${userId}`) || '' : '')
  );
  const [googleClientId, setGoogleClientId] = useState<string>(
    () => (userId ? localStorage.getItem(`edutrack_google_client_id_${userId}`) || '' : '')
  );
  const [pastedText, setPastedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setAppsScriptUrl(userId ? localStorage.getItem(`edutrack_apps_script_url_${userId}`) || '' : '');
    setScriptToken(userId ? localStorage.getItem(`edutrack_apps_script_token_${userId}`) || '' : '');
    setShowToken(false);
    setWarnMsg(null);
    setAccessToken(userId ? localStorage.getItem(`edutrack_google_classroom_token_${userId}`) || '' : '');
    setGoogleClientId(userId ? localStorage.getItem(`edutrack_google_client_id_${userId}`) || '' : '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingResult(null);
    setResolutions({});
  }, [userId]);

  if (!isClassroomModalOpen) return null;

  const countTasks = (result: ClassroomSyncResult, draftId: string) =>
    result.tasks.filter((t) => t.subjectId === draftId).length;

  const autoMatches = (result: ClassroomSyncResult) =>
    result.subjects.map((draft) => ({ draft, match: findMatchingSubject(draft, subjects) as Subject | null }));

  /** Writes the result; throws are shown in the modal. */
  const runApply = async (result: ClassroomSyncResult, chosen: Record<string, CourseResolution>) => {
    setIsLoading(true);
    setStepStatus('Salvando atividades no Supabase (sem duplicar)...');
    try {
      const summary = await applyClassroomSyncResult(result, chosen);
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
    const unmatched = matches.filter((m) => !m.match);
    if (unmatched.length === 0) {
      await runApply(result, {});
      return;
    }
    const defaults: Record<string, CourseResolution> = {};
    for (const { draft } of unmatched) defaults[draft.id] = { action: 'create' };
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

  const handleGoogleApiTokenSync = async (tokenToUse?: string) => {
    const token = (tokenToUse ?? accessToken).trim();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token) {
      setErrorMsg('Informe o Token de Acesso OAuth 2.0 do Google Classroom ou autentique com o Google.');
      return;
    }

    setIsLoading(true);
    setStepStatus('Consultando turmas ativas em classroom.googleapis.com/v1/courses...');

    try {
      if (userId) localStorage.setItem(`edutrack_google_classroom_token_${userId}`, token);
      const result = await fetchGoogleClassroomFullData(token);
      await processResult(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Não foi possível conectar à API do Google Classroom.');
    }
  };

  const handleGoogleOAuthPopup = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanClientId = googleClientId.trim();
    if (!cleanClientId) {
      setErrorMsg(
        'Informe seu Google OAuth Client ID (.apps.googleusercontent.com) ou use a aba "1. Tempo Real (Apps Script)" / "2. Colar do Classroom".'
      );
      return;
    }
    if (cleanClientId.includes('@') || !cleanClientId.includes('.apps.googleusercontent.com')) {
      setErrorMsg(
        'Você digitou um e-mail ou texto inválido no campo Client ID. Aqui vai o ID de aplicativo do Google Cloud (terminado em .apps.googleusercontent.com), NÃO o seu e-mail institucional. Recomendamos usar a aba "1. Tempo Real (Apps Script)" ou "2. Colar do Classroom".'
      );
      return;
    }

    if (userId) localStorage.setItem(`edutrack_google_client_id_${userId}`, cleanClientId);
    setIsLoading(true);
    setStepStatus('Abrindo janela de autorização do Google Classroom...');

    const initAndRequest = () => {
      const g = (window as any).google;
      if (!g?.accounts?.oauth2) {
        setIsLoading(false);
        setErrorMsg('Biblioteca Google Identity Services não pôde ser carregada.');
        return;
      }

      const tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: cleanClientId,
        scope: CLASSROOM_SCOPES,
        callback: (resp: any) => {
          if (resp?.error) {
            setIsLoading(false);
            setErrorMsg(`Erro OAuth Google: ${resp.error}`);
            return;
          }
          if (resp?.access_token) {
            setAccessToken(resp.access_token);
            void handleGoogleApiTokenSync(resp.access_token);
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    };

    if ((window as any).google?.accounts?.oauth2) {
      initAndRequest();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = initAndRequest;
      script.onerror = () => {
        setIsLoading(false);
        setErrorMsg('Falha ao carregar script de autenticação do Google.');
      };
      document.body.appendChild(script);
    }
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
        <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setActiveMode('apps_script');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'apps_script'
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>1. Tempo Real (Apps Script)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('paste_import');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'paste_import'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>2. Colar do Classroom (Ctrl+A)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('google_api');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'google_api'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>3. API Google (Token OAuth)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {pendingResult && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3" data-testid="classroom-review">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Turmas novas ({autoMatches(pendingResult).filter((m) => !m.match).length})
                </h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Estas turmas do Classroom não correspondem a nenhuma disciplina cadastrada. Escolha o que fazer com
                  cada uma antes de importar.
                </p>
              </div>

              <ul className="space-y-2">
                {autoMatches(pendingResult)
                  .filter((m) => !m.match)
                  .map(({ draft }) => (
                    <li
                      key={draft.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{draft.name}</p>
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
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200">
                    Opção A: Token de Acesso OAuth 2.0 (Conexão Direta `classroom.googleapis.com`)
                  </label>
                  <a
                    href="https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fclassroom.courses.readonly%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fclassroom.coursework.me.readonly%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fclassroom.courseworkmaterials.readonly%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fclassroom.announcements.readonly%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fclassroom.rosters.readonly"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    <span>Gerar Token em 1 clique no Google</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clique em <strong>"Gerar Token em 1 clique no Google"</strong>, autorize sua conta do Google Classroom,
                  clique em <em>Exchange authorization code for tokens</em> e cole o <strong>Access token</strong> (<code>ya29...</code> — <strong>NÃO</strong> digite sua senha do e-mail) abaixo:
                </p>
                <input
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ya29.a0AeDClZ... (cole o token longo gerado no OAuth Playground, não sua senha)"
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleGoogleApiTokenSync()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Importar Tudo da Minha Conta Google Classroom via API</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <label className="block text-xs font-bold text-slate-300">
                  Opção B: Login via Pop-up OAuth 2.0 (Google Cloud Client ID — não é seu e-mail)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="123456789-xxxx.apps.googleusercontent.com (não digite seu e-mail)"
                    className="flex-1 bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleOAuthPopup}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-xs cursor-pointer shrink-0"
                  >
                    Abrir Pop-up Google
                  </button>
                </div>
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
            <div className="p-4 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center gap-3 text-xs text-violet-200">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span>{stepStatus}</span>
            </div>
          )}

          {/* Open-script warning (Apps Script answered without checking the token) */}
          {warnMsg && (
            <div
              role="alert"
              data-testid="apps-script-open-warning"
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
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
