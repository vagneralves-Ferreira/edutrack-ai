import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import {
  detectPortalFromContext,
  parseAcademicPortalText,
  sanitizeExtractedFrames,
  type DetectedPortal,
  type ParsedPortalData,
} from '../../src/services/academicParser';
import { extractPortalWithAI } from './aiFallback';
import { collectActiveTabFrames } from './pageCollector';
import { APP_WEB_URL, extensionSupabase, isSupabaseConfigured } from './supabaseClient';
import { syncSelectionToEduTrack, type ExtensionSyncSummary } from './syncService';

type PopupStage = 'idle' | 'reading' | 'preview' | 'syncing' | 'done';

function openWebApp(path = '/#/dashboard'): void {
  const targetUrl = `${APP_WEB_URL}${path}`;
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url: targetUrl });
    return;
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function formatDateBr(isoDate: string | null): string {
  if (!isoDate) return 'Sem prazo definido';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function buildSummaryLine(summary: ExtensionSyncSummary): string {
  const parts: string[] = [];
  if (summary.subjectsCreated > 0) {
    parts.push(
      `${summary.subjectsCreated} ${summary.subjectsCreated === 1 ? 'disciplina adicionada' : 'disciplinas adicionadas'}`
    );
  }
  if (summary.subjectsExisting > 0) {
    parts.push(
      `${summary.subjectsExisting} ${summary.subjectsExisting === 1 ? 'já existente ignorada' : 'já existentes ignoradas'}`
    );
  }
  if (summary.tasksCreated > 0) {
    parts.push(`${summary.tasksCreated} ${summary.tasksCreated === 1 ? 'prazo adicionado' : 'prazos adicionados'}`);
  }
  if (summary.tasksUpdated > 0) {
    parts.push(`${summary.tasksUpdated} ${summary.tasksUpdated === 1 ? 'prazo atualizado' : 'prazos atualizados'}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'Tudo já estava sincronizado no seu painel.';
}

export const PopupApp: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Formulário de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Aba ativa & portal detectado
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [detectedPortal, setDetectedPortal] = useState<DetectedPortal>({
    id: 'generic',
    label: 'Portal Acadêmico',
    isSupportedPage: true,
  });

  // Estado da leitura / revisão / sincronização
  const [stage, setStage] = useState<PopupStage>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedAiExtraction, setUsedAiExtraction] = useState(false);

  const [parsedData, setParsedData] = useState<ParsedPortalData>({ subjects: [], tasks: [] });
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [syncSummary, setSyncSummary] = useState<ExtensionSyncSummary | null>(null);

  // Carrega sessão persistente em chrome.storage.local
  useEffect(() => {
    if (!isSupabaseConfigured || !extensionSupabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    void extensionSupabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = extensionSupabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setStage('idle');
        setParsedData({ subjects: [], tasks: [] });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Detecta a aba ativa e o portal universitário
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const current = tabs[0];
        if (!current) return;
        setActiveTabId(current.id ?? null);
        setActiveTabTitle(current.title || '');
        setDetectedPortal(detectPortalFromContext(current.url, current.title));
      })
      .catch(() => {});
  }, [user]);

  const studentDisplayName = useMemo(() => {
    if (!user) return '';
    const meta = (user.user_metadata || {}) as { name?: string };
    return meta.name?.trim() || user.email?.split('@')[0] || 'Estudante';
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setLoginError('Informe seu e-mail e senha para entrar.');
      return;
    }
    if (!isSupabaseConfigured || !extensionSupabase) {
      setLoginError('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      return;
    }

    setLoginBusy(true);
    try {
      const { data, error } = await extensionSupabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        setLoginError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
        return;
      }
      setUser(data.user);
      setPassword('');
    } catch {
      setLoginError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (extensionSupabase) {
      await extensionSupabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setStage('idle');
    setParsedData({ subjects: [], tasks: [] });
    setSyncSummary(null);
    setErrorMessage(null);
  };

  const handleReadCurrentPage = async () => {
    setErrorMessage(null);
    setSyncSummary(null);
    setUsedAiExtraction(false);

    if (!detectedPortal.isSupportedPage) {
      setErrorMessage(
        detectedPortal.blockedReason ||
          'Esta página não permite leitura automática. Abra o portal da sua faculdade e tente novamente.'
      );
      return;
    }

    if (activeTabId == null) {
      setErrorMessage('Não foi possível identificar a aba atual. Recarregue a página e tente novamente.');
      return;
    }

    setStage('reading');
    setStatusMessage('Lendo disciplinas e prazos desta página...');

    try {
      const frames = await collectActiveTabFrames(activeTabId);
      const sanitizedText = sanitizeExtractedFrames(frames);

      if (!sanitizedText || sanitizedText.length < 15) {
        setStage('idle');
        setErrorMessage(
          'Não encontramos disciplinas ou prazos visíveis nesta tela. Abra a página de Cursos, Disciplinas ou Calendário do seu portal e tente novamente.'
        );
        return;
      }

      // Atualiza o selo do portal também considerando o texto lido dentro de iframes
      const refinedPortal = detectPortalFromContext(frames[0]?.url, activeTabTitle, sanitizedText);
      if (refinedPortal.isSupportedPage) {
        setDetectedPortal(refinedPortal);
      }

      let result = parseAcademicPortalText(sanitizedText);

      // Fallback inteligente via assistente de IA quando a página usa um layout proprietário
      if (result.subjects.length === 0 && result.tasks.length === 0) {
        setStatusMessage('Analisando o layout do portal com leitura inteligente...');
        const aiResult = await extractPortalWithAI(sanitizedText, refinedPortal.label);
        if (aiResult.subjects.length > 0 || aiResult.tasks.length > 0) {
          result = aiResult;
          setUsedAiExtraction(true);
        }
      }

      if (result.subjects.length === 0 && result.tasks.length === 0) {
        setStage('idle');
        setErrorMessage(
          'Nenhuma disciplina ou prazo acadêmico foi encontrado nesta página. Navegue até a lista de disciplinas ou calendário de entregas do portal e clique novamente em "Ler esta página".'
        );
        return;
      }

      setParsedData(result);
      setSelectedSubjectIds(new Set(result.subjects.map((s) => s.tempId)));
      setSelectedTaskIds(new Set(result.tasks.map((t) => t.tempId)));
      setStage('preview');
    } catch (err: any) {
      setStage('idle');
      const rawMsg = String(err?.message || '');
      if (rawMsg.toLowerCase().includes('sessão expirou') || rawMsg.toLowerCase().includes('session')) {
        setErrorMessage('Sua sessão expirou. Entre novamente para continuar.');
        await handleSignOut();
      } else if (rawMsg.toLowerCase().includes('cannot access') || rawMsg.toLowerCase().includes('extensions gallery')) {
        setErrorMessage(
          'O navegador bloqueia a leitura nesta página. Abra o portal da sua faculdade em uma aba normal e tente novamente.'
        );
      } else {
        setErrorMessage(
          rawMsg || 'Não foi possível ler esta página. Recarregue o portal da faculdade e tente novamente.'
        );
      }
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedSubjects = useMemo(
    () => parsedData.subjects.filter((s) => selectedSubjectIds.has(s.tempId)),
    [parsedData.subjects, selectedSubjectIds]
  );

  const selectedTasks = useMemo(
    () => parsedData.tasks.filter((t) => selectedTaskIds.has(t.tempId)),
    [parsedData.tasks, selectedTaskIds]
  );

  const totalSelectedCount = selectedSubjects.length + selectedTasks.length;

  const handleSyncToPanel = async () => {
    if (totalSelectedCount === 0) return;
    setErrorMessage(null);
    setStage('syncing');
    setStatusMessage('Sincronizando com o seu painel EduTrack AI...');

    try {
      const summary = await syncSelectionToEduTrack(selectedSubjects, selectedTasks);
      setSyncSummary(summary);
      setStage('done');
    } catch (err: any) {
      setStage('preview');
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('sessão expirou')) {
        setErrorMessage('Sua sessão expirou. Entre novamente na sua conta para sincronizar.');
        await handleSignOut();
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setErrorMessage('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else {
        setErrorMessage(msg || 'Não foi possível concluir a sincronização. Tente novamente.');
      }
    }
  };

  return (
    <div className="w-[380px] min-h-[460px] bg-[#07070b] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Glow ambiental */}
      <div className="pointer-events-none absolute -top-20 -right-16 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl" />

      {/* Top Brand Bar */}
      <header className="relative z-10 px-4 py-3.5 border-b border-white/[0.08] bg-[#10111a]/90 backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1px] shrink-0 shadow-md shadow-violet-600/25">
            <div className="w-full h-full rounded-[11px] bg-[#090a10] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">EduTrack AI</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Sincronizador Acadêmico</p>
          </div>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title="Sair da conta"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair</span>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-4 flex flex-col justify-between gap-4">
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-14 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Verificando sua conta...</span>
          </div>
        ) : !user ? (
          /* Tela de Login */
          <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
            <div className="space-y-1">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Entre na sua conta
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecte seu EduTrack AI para importar disciplinas e prazos direto do portal da sua faculdade.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu.email@faculdade.edu.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Sua senha do EduTrack AI"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-60 text-white font-bold text-xs shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loginBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={() => openWebApp('/#/cadastro')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Ainda não tem conta? <span className="underline underline-offset-4 font-semibold">Criar conta grátis</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tela Logada */
          <div className="flex-1 flex flex-col gap-3.5">
            {/* Estudante + Badge do Portal Detectado */}
            <div className="p-3 rounded-2xl bg-[#10111a] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{studentDisplayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Conectado
                </span>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">Portal detectado</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[230px] ${
                    detectedPortal.isSupportedPage
                      ? 'bg-violet-500/15 border-violet-500/30 text-cyan-300'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">{detectedPortal.label}</span>
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-200 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Estado Inicial */}
            {stage === 'idle' && (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                  <h2 className="text-xs font-bold text-white">Pronto para capturar sua grade</h2>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {detectedPortal.isSupportedPage
                      ? 'Abra a página de disciplinas, cursos ou calendário de entregas no portal da sua faculdade e clique abaixo.'
                      : detectedPortal.blockedReason}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={!detectedPortal.isSupportedPage}
                    onClick={() => void handleReadCurrentPage()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ScanSearch className="w-4 h-4" />
                    <span>Ler esta página</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openWebApp('/#/dashboard')}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Abrir meu EduTrack AI</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Estado de Leitura ou Sincronização */}
            {(stage === 'reading' || stage === 'syncing') && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-300" />
                </div>
                <p className="text-xs font-semibold text-white">{statusMessage}</p>
                <p className="text-[11px] text-slate-400">Isso leva apenas alguns segundos.</p>
              </div>
            )}

            {/* Estado de Prévia Seletiva */}
            {stage === 'preview' && (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {usedAiExtraction && (
                  <div className="px-3 py-1.5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-[10px] text-fuchsia-200 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-fuchsia-300 shrink-0" />
                    <span>Itens estruturados automaticamente com leitura inteligente.</span>
                  </div>
                )}

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {/* Disciplinas encontradas */}
                  {parsedData.subjects.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                          Disciplinas encontradas ({selectedSubjects.length}/{parsedData.subjects.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {parsedData.subjects.map((sub) => {
                          const checked = selectedSubjectIds.has(sub.tempId);
                          return (
                            <label
                              key={sub.tempId}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-violet-500/10 border-violet-500/30 text-white'
                                  : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSubject(sub.tempId)}
                                className="mt-0.5 accent-violet-500 rounded cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[11px] leading-snug truncate">{sub.name}</p>
                                {(sub.code || sub.professor) && (
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {[sub.code, sub.professor].filter(Boolean).join(' • ')}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Prazos / Atividades encontradas */}
                  {parsedData.tasks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          Prazos e atividades ({selectedTasks.length}/{parsedData.tasks.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {parsedData.tasks.map((task) => {
                          const checked = selectedTaskIds.has(task.tempId);
                          return (
                            <label
                              key={task.tempId}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                  : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTask(task.tempId)}
                                className="mt-0.5 accent-emerald-500 rounded cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[11px] leading-snug truncate">{task.title}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {task.courseName || 'Atividades do Portal'} • {formatDateBr(task.dueDate)}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-1 space-y-2 mt-auto">
                  <button
                    type="button"
                    disabled={totalSelectedCount === 0}
                    onClick={() => void handleSyncToPanel()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-45 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Sincronizar com meu painel ({totalSelectedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage('idle');
                      setErrorMessage(null);
                    }}
                    className="w-full py-1.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Ler novamente
                  </button>
                </div>
              </div>
            )}

            {/* Estado Concluído */}
            {stage === 'done' && syncSummary && (
              <div className="flex-1 flex flex-col justify-between gap-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-extrabold text-white">Sincronização concluída!</h2>
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    {buildSummaryLine(syncSummary)}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => openWebApp('/#/dashboard')}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Abrir meu EduTrack AI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage('idle');
                      setSyncSummary(null);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Ler outra página</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
