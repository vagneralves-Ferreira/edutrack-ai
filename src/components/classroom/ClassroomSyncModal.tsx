import React, { useState } from 'react';
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
import { usePlanner } from '../../context/PlannerContext';
import {
  fetchGoogleClassroomFullData,
  fetchGoogleAppsScriptClassroom,
  APPS_SCRIPT_BRIDGE_CODE,
  buildFullClassroomImpactaSync,
  parseClassroomPastedContent,
} from '../../services/classroomSync';

const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
].join(' ');

export const ClassroomSyncModal: React.FC = () => {
  const {
    isClassroomModalOpen,
    setIsClassroomModalOpen,
    subjects,
    applyClassroomSyncResult,
    lastClassroomSync,
  } = usePlanner();

  const [activeMode, setActiveMode] = useState<
    'apps_script' | 'paste_import' | 'google_api' | 'full_impacta'
  >('apps_script');
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(
    () => localStorage.getItem('edutrack_apps_script_url') || ''
  );
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>(
    () => localStorage.getItem('edutrack_google_classroom_token') || ''
  );
  const [googleClientId, setGoogleClientId] = useState<string>(
    () => localStorage.getItem('edutrack_google_client_id') || ''
  );
  const [pastedText, setPastedText] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isClassroomModalOpen) return null;

  const handleFullImpactaSync = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    setStepStatus('Conectando ao Google Workspace • Faculdade Impacta...');

    setTimeout(() => {
      setStepStatus('Importando Turmas, Professores, Materiais de Aula e Mural...');
    }, 650);

    setTimeout(async () => {
      setStepStatus('Sincronizando Atividades, Avaliações, Notas e Prazos com Supabase...');
      const result = buildFullClassroomImpactaSync(subjects);
      await applyClassroomSyncResult(result);
      setIsLoading(false);
      setSuccessMsg(
        `Sincronização concluída! ${result.stats.coursesCount} disciplinas, ${result.stats.tasksCount} atividades do Classroom, ${result.stats.materialsCount} materiais/avisos e ${result.stats.evaluationsCount} avaliações abastecidas no EduTrack AI.`
      );
    }, 1400);
  };

  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_BRIDGE_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      setErrorMsg('Não foi possível copiar automaticamente. Selecione e copie o script manualmente abaixo.');
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
      localStorage.setItem('edutrack_apps_script_url', cleanUrl);
      const result = await fetchGoogleAppsScriptClassroom(cleanUrl);
      setStepStatus('Atualizando disciplinas, todas as entregas e Cockpit no EduTrack AI...');
      await applyClassroomSyncResult(result);
      setIsLoading(false);
      setSuccessMsg(
        `Classroom conectado! ${result.stats.coursesCount} turmas, ${result.stats.tasksCount} atividades/entregas, ${result.stats.materialsCount} materiais e ${result.stats.announcementsCount} avisos sincronizados.`
      );
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
      localStorage.setItem('edutrack_google_classroom_token', token);
      const result = await fetchGoogleClassroomFullData(token);
      setStepStatus('Salvando disciplinas, materiais, notas e atividades no EduTrack AI...');
      await applyClassroomSyncResult(result);
      setIsLoading(false);
      setSuccessMsg(
        `Conectado à API oficial! ${result.stats.coursesCount} turmas, ${result.stats.tasksCount} atividades, ${result.stats.materialsCount} materiais e ${result.stats.announcementsCount} avisos do mural importados em tempo real.`
      );
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

    localStorage.setItem('edutrack_google_client_id', cleanClientId);
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
      const result = parseClassroomPastedContent(pastedText, subjects, replaceExisting);
      await applyClassroomSyncResult(result);
      setIsLoading(false);
      setPastedText('');
      setSuccessMsg(
        `Importação concluída! ${result.stats.coursesCount} disciplinas e ${result.stats.tasksCount} atividades do Classroom abastecidas no EduTrack AI.`
      );
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
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-[#10111a] to-violet-950/40">
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

          <button
            type="button"
            onClick={() => {
              setActiveMode('full_impacta');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'full_impacta'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Dados Base Impacta</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeMode === 'apps_script' && (
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
                    com seu e-mail <strong>@aluno.impacta.edu.br</strong> → <em>Novo projeto</em>.
                  </li>
                  <li>
                    Cole o código no editor, clique em <strong>Serviços (+)</strong> à esquerda → adicione <strong>Google Classroom API</strong>.
                  </li>
                  <li>
                    Clique em <strong>Implantar → Nova implantação → App da Web</strong> (<em>Executar como: Eu</em>, <em>Quem pode acessar: Qualquer pessoa</em>), autorize e cole a URL gerada abaixo:
                  </li>
                </ol>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Código oficial para colar no Apps Script:</span>
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
                  {APPS_SCRIPT_BRIDGE_CODE}
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

          {activeMode === 'full_impacta' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 leading-relaxed">
                <strong>Atenção:</strong> Esta aba carrega o <strong>modelo base salvo no aplicativo</strong> (não lê automaticamente entregas novas da sua conta Google Classroom). Para importar todas as 15+ entregas de Innovation Lab e seus avisos reais, use a aba <strong>1. Tempo Real (Apps Script)</strong> ou <strong>2. Colar do Classroom (Ctrl+A)</strong>.
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                  O que existe no modelo base Impacta:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">5 Disciplinas do Classroom</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        SQL Fundamentals, Programming & Algorithms, Database Design, Innovation Lab e Software Engineering.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">6 Atividades Oficiais do Classroom</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Desafio da Procedure (07/11), Tarefas a serem realizadas (19/11), Entrega final do Projeto (23/11), Avaliação Parcial 02 (21/10), TA: Uso do Modelo Cascata (22/08) e Dinâmica Modelos de Desenvolvimento (02/09).
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Materiais & Avisos do Mural</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Apostilas, slides, links do Google Drive e comunicados dos professores em cada disciplina.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                    <GraduationCap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Avaliações, Pesos & Notas</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Cronograma de provas parciais, pesos e notas sincronizados com o Cockpit e Supabase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleFullImpactaSync}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>
                  {isLoading
                    ? 'Sincronizando todas as informações...'
                    : 'Vincular e Abastecer Todas as Informações do Classroom Agora'}
                </span>
              </button>
            </div>
          )}

          {activeMode === 'google_api' && (
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

          {activeMode === 'paste_import' && (
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
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-violet-500 focus:ring-violet-500"
                  />
                  <span>Substituir tarefas atuais do Classroom para corresponder exatamente ao texto colado</span>
                </label>
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
