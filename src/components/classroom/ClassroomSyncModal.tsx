import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookMarked,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Upload,
  FileText,
  Calendar,
  BookOpen,
  CheckSquare,
  GraduationCap,
  Puzzle,
  User,
} from 'lucide-react';
import { usePlanner, type CourseResolution, type ClassroomApplySummary } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchGoogleClassroomFullData,
  type ClassroomSyncResult,
} from '../../services/classroomSync';
import { autoResolveCourse } from '../../services/classroomImport';
import {
  ACCEPTED_DOCUMENT_INPUT_ACCEPT,
  buildDocumentSyncPayload,
  extractDocumentViaAI,
  getOfficialExtensionStoreUrl,
  type DocumentExtractionPreview,
} from '../../services/documentImport';
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
import { formatDateBR } from '../../utils/helpers';
import type { Subject } from '../../types';

function describeSummary(summary: ClassroomApplySummary): string {
  const parts: string[] = [];
  if (summary.subjectsCreated > 0) {
    parts.push(
      `${summary.subjectsCreated} ${summary.subjectsCreated === 1 ? 'disciplina adicionada' : 'disciplinas adicionadas'}`
    );
  }
  if (summary.inserted > 0) {
    parts.push(
      `${summary.inserted} ${summary.inserted === 1 ? 'novo prazo salvo' : 'novos prazos salvos'}`
    );
  }
  if (summary.updated > 0) {
    parts.push(
      `${summary.updated} ${summary.updated === 1 ? 'atividade atualizada sem duplicar' : 'atividades atualizadas sem duplicar'}`
    );
  }
  if (summary.ignoredCourses > 0) {
    parts.push(
      `${summary.ignoredCourses} ${summary.ignoredCourses === 1 ? 'turma ignorada' : 'turmas ignoradas'}`
    );
  }

  if (parts.length === 0) {
    return 'Sua grade já estava atualizada — nenhum item duplicado foi criado.';
  }
  return `Importação concluída: ${parts.join(' • ')}.`;
}

/** Removes OAuth tokens/client ids that older versions of this modal saved in localStorage. */
function purgeLegacyGoogleStorage() {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('edutrack_google_classroom_token_') ||
          key.startsWith('edutrack_google_client_id_'))
      ) {
        stale.push(key);
      }
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing to clean
  }
}

type ImportTabMode = 'upload_document' | 'google_api';

export const ClassroomSyncModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
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

  // Always-current values for async flows (e.g. Google redirect right after page load).
  const latestRef = useRef({
    subjects,
    tasks,
    ignoredCourses,
    apply: applyClassroomSyncResult,
    ready: isPlannerReady,
  });
  latestRef.current = {
    subjects,
    tasks,
    ignoredCourses,
    apply: applyClassroomSyncResult,
    ready: isPlannerReady,
  };

  const ignoredCourseNames = [...new Set(ignoredCourses.map((c) => c.courseName))];
  const officialExtensionStoreUrl = getOfficialExtensionStoreUrl();
  const googleClientId = getGoogleClientId();

  const [activeMode, setActiveMode] = useState<ImportTabMode>('upload_document');
  const [googleReady, setGoogleReady] = useState<boolean>(() => isGoogleIdentityLoaded());
  const [googleLoadError, setGoogleLoadError] = useState<string | null>(null);
  const googleAbortRef = useRef<AbortController | null>(null);
  const [awaitingGoogle, setAwaitingGoogle] = useState<boolean>(false);

  // Document (PDF / Image) upload & preview states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState<boolean>(false);
  const [analyzingFileName, setAnalyzingFileName] = useState<string>('');
  const [documentPreview, setDocumentPreview] = useState<DocumentExtractionPreview | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(() => new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());

  // Google Classroom review state ("Turmas novas")
  const [pendingResult, setPendingResult] = useState<ClassroomSyncResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, CourseResolution>>({});

  // Shared modal feedback states (single source of truth for errors, warnings, loading, success)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorScopes, setErrorScopes] = useState<{ forError: string; scopes: string[] } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const wasOpenRef = useRef<boolean>(false);
  const openingFromRedirectRef = useRef<boolean>(false);

  const showScopeError = (message: string, scopes: string[] | undefined) => {
    setErrorMsg(message);
    setErrorScopes(scopes ? { forError: message, scopes } : null);
  };

  const clearFeedback = () => {
    setErrorMsg(null);
    setErrorScopes(null);
    setWarnMsg(null);
    setSuccessMsg(null);
  };

  useEffect(() => {
    clearFeedback();
    setDocumentPreview(null);
    setSelectedSubjectIds(new Set());
    setSelectedTaskIds(new Set());
    setPendingResult(null);
    setResolutions({});
  }, [userId]);

  useEffect(() => {
    purgeLegacyGoogleStorage();
  }, []);

  // Ensure every fresh open lands on the clean "Enviar Grade" tab (except Google OAuth redirect return).
  useEffect(() => {
    if (isClassroomModalOpen && !wasOpenRef.current) {
      if (openingFromRedirectRef.current) {
        openingFromRedirectRef.current = false;
      } else {
        setActiveMode('upload_document');
        clearFeedback();
        setDocumentPreview(null);
        setSelectedSubjectIds(new Set());
        setSelectedTaskIds(new Set());
        setPendingResult(null);
        setResolutions({});
        setIsDraggingOver(false);
        dragDepthRef.current = 0;
      }
    }
    wasOpenRef.current = isClassroomModalOpen;
  }, [isClassroomModalOpen]);

  // Close on Escape when not mid-request
  useEffect(() => {
    if (!isClassroomModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !isAnalyzingDocument) {
        setIsClassroomModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isClassroomModalOpen, isLoading, isAnalyzingDocument, setIsClassroomModalOpen]);

  // Back from Google (redirect flow)
  const runGoogleImportRef = useRef<((access: ClassroomAccess) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!userId || !hasClassroomRedirectResult()) return;
    const outcome = consumeClassroomRedirectResult();
    if (!outcome) return;
    openingFromRedirectRef.current = true;
    setActiveMode('google_api');
    setIsClassroomModalOpen(true);
    if (!outcome.ok) {
      showScopeError(outcome.error, outcome.grantedScopes);
      return;
    }
    void runGoogleImportRef.current?.(outcome.access);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load Google Identity Services only when the user opens the Google Classroom tab
  useEffect(() => {
    if (!isClassroomModalOpen || activeMode !== 'google_api' || !googleClientId) return;
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
  }, [isClassroomModalOpen, activeMode, googleClientId]);

  const countTasks = (result: ClassroomSyncResult, draftId: string) =>
    result.tasks.filter((t) => t.subjectId === draftId).length;

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
    setErrorScopes(null);
    try {
      await restoreIgnoredCourse(courseName);
      setSuccessMsg(
        `A turma "${courseName}" voltará a aparecer na próxima sincronização com o Google Classroom.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível restaurar a turma.');
    }
  };

  const runApply = async (result: ClassroomSyncResult, chosen: Record<string, CourseResolution>) => {
    setIsLoading(true);
    setStepStatus('Salvando disciplinas e prazos na sua conta...');
    try {
      const summary = await latestRef.current.apply(result, chosen);
      setPendingResult(null);
      setResolutions({});
      setDocumentPreview(null);
      setSelectedSubjectIds(new Set());
      setSelectedTaskIds(new Set());
      setSuccessMsg(describeSummary(summary));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar os itens importados na sua conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const processGoogleResult = async (result: ClassroomSyncResult) => {
    const matches = autoMatches(result);
    const unmatched = matches.filter(isNewCourse);
    const statesMap = result.courseStates || {};
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
      value === 'create'
        ? { action: 'create' }
        : value === 'ignore'
        ? { action: 'ignore' }
        : { action: 'link', subjectId: value };
    setResolutions((prev) => ({ ...prev, [draftId]: next }));
  };

  const resolutionValue = (r?: CourseResolution) =>
    !r || r.action === 'create' ? 'create' : r.action === 'ignore' ? 'ignore' : r.subjectId;

  // Document (PDF / Screenshot) analysis flow
  const handleDocumentSelected = async (file: File | null | undefined) => {
    if (!file || isAnalyzingDocument || isLoading) return;
    clearFeedback();
    setDocumentPreview(null);
    setAnalyzingFileName(file.name);
    setIsAnalyzingDocument(true);

    try {
      const preview = await extractDocumentViaAI(file, latestRef.current.subjects);
      setDocumentPreview(preview);
      setSelectedSubjectIds(new Set(preview.subjects.map((s) => s.id)));
      setSelectedTaskIds(new Set(preview.tasks.map((t) => t.id)));
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Não foi possível analisar o arquivo enviado. Tente novamente com um PDF ou print nítido.'
      );
    } finally {
      setIsAnalyzingDocument(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void handleDocumentSelected(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnalyzingDocument || isLoading) return;
    dragDepthRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDraggingOver(false);
    if (isAnalyzingDocument || isLoading) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      void handleDocumentSelected(file);
    }
  };

  const toggleSubjectSelection = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSubjects = () => {
    if (!documentPreview) return;
    const allSelected = selectedSubjectIds.size === documentPreview.subjects.length;
    setSelectedSubjectIds(
      allSelected ? new Set() : new Set(documentPreview.subjects.map((s) => s.id))
    );
  };

  const toggleAllTasks = () => {
    if (!documentPreview) return;
    const allSelected = selectedTaskIds.size === documentPreview.tasks.length;
    setSelectedTaskIds(
      allSelected ? new Set() : new Set(documentPreview.tasks.map((t) => t.id))
    );
  };

  const handleSaveDocumentPreview = async () => {
    if (!documentPreview || isLoading) return;
    setErrorMsg(null);
    setErrorScopes(null);
    setSuccessMsg(null);

    try {
      const { result, resolutions: docResolutions } = buildDocumentSyncPayload(
        documentPreview,
        selectedSubjectIds,
        selectedTaskIds,
        latestRef.current.subjects
      );
      await runApply(result, docResolutions);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível salvar os itens selecionados.');
    }
  };

  // Google Classroom official 1-click OAuth flow
  const runGoogleImport = async (access: ClassroomAccess) => {
    let token: string | null = access.accessToken;
    clearFeedback();
    setIsLoading(true);
    try {
      setStepStatus('Autorizado! Lendo suas turmas no Google Classroom...');
      const result = await fetchGoogleClassroomFullData(
        token,
        {
          materials: access.granted.materials,
          announcements: access.granted.announcements,
          rosters: access.granted.rosters,
        },
        setStepStatus
      );
      setStepStatus(
        `${result.stats.coursesCount} turma(s) e ${result.stats.tasksCount} atividade(s) encontradas. Preparando importação...`
      );
      revokeAccessToken(token);
      token = null;

      const warnings = [...(result.warnings || [])];
      if (access.missingOptional.length > 0) {
        warnings.push(
          `Permissões opcionais não concedidas: ${access.missingOptional.join(', ')}. Essas informações ficaram de fora.`
        );
      }
      setWarnMsg(warnings.length > 0 ? warnings.join(' ') : null);

      if (!latestRef.current.ready) {
        setStepStatus('Carregando suas disciplinas para vincular as turmas...');
        const started = Date.now();
        while (!latestRef.current.ready && Date.now() - started < 20000) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      await processGoogleResult(result);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Não foi possível importar do Google Classroom.');
    } finally {
      if (token) revokeAccessToken(token);
    }
  };
  runGoogleImportRef.current = runGoogleImport;

  const handleGoogleRedirect = () => {
    clearFeedback();
    if (!googleClientId) {
      setErrorMsg(
        'A conexão direta com o Google Classroom não está configurada neste ambiente. Use a aba Enviar Grade para importar seu PDF ou print.'
      );
      return;
    }
    try {
      setIsLoading(true);
      setStepStatus('Redirecionando para o Google...');
      startClassroomRedirect(googleClientId);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Não foi possível iniciar a conexão com o Google.');
    }
  };

  const handleGooglePopup = () => {
    clearFeedback();
    if (!googleClientId) {
      setErrorMsg(
        'A conexão direta com o Google Classroom não está configurada neste ambiente. Use a aba Enviar Grade para importar seu PDF ou print.'
      );
      return;
    }
    if (!googleReady) {
      setErrorMsg(
        googleLoadError || 'A conexão com o Google ainda está carregando. Aguarde um instante e clique novamente.'
      );
      return;
    }

    setIsLoading(true);
    setStepStatus('Aguardando autorização no Google... Conclua na janela aberta.');
    const controller = new AbortController();
    googleAbortRef.current = controller;
    setAwaitingGoogle(true);
    const accessPromise = requestClassroomAccess(googleClientId, {
      signal: controller.signal,
      onPopupMaybeClosed: () =>
        setStepStatus(
          'Aguardando autorização na janela do Google... Conclua por lá ou clique em Cancelar se fechou a janela.'
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

  if (!isClassroomModalOpen) return null;

  const totalSelectedCount = selectedSubjectIds.size + selectedTaskIds.size;

  // Theme-explicit classes so Light Mode and Dark Mode both maintain WCAG AA/AAA contrast
  // without colliding with global html.light overrides in index.css.
  const modalSurface = isLight
    ? 'bg-white border border-slate-200 text-slate-900 shadow-2xl'
    : 'bg-[#10111a] border border-violet-500/30 text-slate-100 shadow-2xl';
  const headerSurface = isLight
    ? 'bg-slate-50 border-b border-slate-200'
    : 'bg-gradient-to-r from-emerald-950/50 via-[#121420] to-violet-950/50 border-b border-white/10';
  const titleText = isLight ? 'text-slate-900' : 'text-white';
  const mutedText = isLight ? 'text-slate-600' : 'text-slate-300';
  const subtleText = isLight ? 'text-slate-500' : 'text-slate-400';
  const cardSurface = isLight
    ? 'bg-slate-50 border border-slate-200'
    : 'bg-white/[0.03] border border-white/10';
  const itemSurface = isLight
    ? 'bg-white border border-slate-200 hover:border-violet-400'
    : 'bg-white/[0.04] border border-white/10 hover:border-violet-400/50';
  const secondaryBtnClass = isLight
    ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
    : 'bg-white/[0.07] hover:bg-white/[0.13] border border-white/10 text-slate-100';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading && !isAnalyzingDocument) {
          setIsClassroomModalOpen(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className={`w-full max-w-2xl rounded-3xl overflow-hidden max-h-[92vh] flex flex-col ${modalSurface}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between gap-3 ${headerSurface}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isLight
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                  : 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400'
              }`}
            >
              <BookMarked className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="import-modal-title"
                className={`text-base sm:text-lg font-extrabold tracking-tight ${titleText}`}
              >
                Importar Grade e Atividades
              </h3>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                Organize suas disciplinas e prazos em segundos, sem digitar tudo manualmente.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar"
            disabled={isLoading || isAnalyzingDocument}
            onClick={() => setIsClassroomModalOpen(false)}
            className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
              isLight
                ? 'bg-slate-200/70 hover:bg-slate-200 text-slate-700'
                : 'bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Last Sync Status Bar */}
        {lastClassroomSync && (
          <div
            className={`px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] border-b ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2
                className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
              />
              <span>
                Última importação: {lastClassroomSync.timestamp} ({lastClassroomSync.coursesCount}{' '}
                {lastClassroomSync.coursesCount === 1 ? 'disciplina' : 'disciplinas'} •{' '}
                {lastClassroomSync.tasksCount}{' '}
                {lastClassroomSync.tasksCount === 1 ? 'atividade' : 'atividades'})
              </span>
            </div>
            <span
              className={`font-mono uppercase font-bold ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              Sincronizado
            </span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div
          className={`px-6 pt-4 pb-3 flex items-center gap-2 border-b ${
            isLight ? 'border-slate-200 bg-white' : 'border-white/[0.08]'
          }`}
          role="tablist"
        >
          {(
            [
              { mode: 'upload_document', label: 'Enviar Grade', Icon: Upload },
              { mode: 'google_api', label: 'Google Classroom', Icon: GraduationCap },
            ] as const
          ).map(({ mode, label, Icon }) => {
            const isTabActive = activeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                disabled={isLoading || isAnalyzingDocument}
                onClick={() => {
                  setActiveMode(mode);
                  clearFeedback();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 ${
                  isTabActive
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-600/25'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SINGLE Error Alert location in the entire modal */}
          {errorMsg && (
            <div
              role="alert"
              data-testid="import-modal-error"
              className={`p-4 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{errorMsg}</p>
                {errorScopes && errorScopes.forError === errorMsg && (
                  <div className="mt-2" data-testid="classroom-error-scopes">
                    <p className="font-bold">
                      Permissões concedidas ({errorScopes.scopes.length}):
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
            <div
              role="status"
              data-testid="import-modal-success"
              className={`p-4 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold leading-relaxed ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
              />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Warnings */}
          {warnMsg && (
            <div
              role="alert"
              data-testid="classroom-warning"
              className={`p-4 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}
              />
              <span>{warnMsg}</span>
            </div>
          )}

          {/* Google Classroom Review ("Turmas novas") */}
          {pendingResult && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLight
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
              data-testid="classroom-review"
            >
              <div>
                <h4
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    isLight ? 'text-amber-900' : 'text-amber-300'
                  }`}
                >
                  Turmas novas ({autoMatches(pendingResult).filter(isNewCourse).length})
                </h4>
                <p className={`text-xs mt-1 ${mutedText}`}>
                  Escolha o que fazer com cada turma encontrada no Google Classroom antes de salvar.
                </p>
              </div>

              <ul className="space-y-2">
                {autoMatches(pendingResult)
                  .filter(isNewCourse)
                  .map(({ draft }) => (
                    <li
                      key={draft.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border ${itemSurface}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold truncate ${titleText}`}>{draft.name}</p>
                          {pendingResult.courseStates?.[draft.id] &&
                            pendingResult.courseStates[draft.id] !== 'ACTIVE' && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                                  isLight
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-white/10 text-slate-200'
                                }`}
                              >
                                {pendingResult.courseStates[draft.id]}
                              </span>
                            )}
                        </div>
                        <p className={`text-[11px] ${subtleText}`}>
                          {countTasks(pendingResult, draft.id)} atividade(s)
                        </p>
                      </div>
                      <select
                        aria-label={`O que fazer com a turma ${draft.name}`}
                        value={resolutionValue(resolutions[draft.id])}
                        onChange={(e) => handleResolutionChange(draft.id, e.target.value)}
                        className={`sm:w-64 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-violet-500 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-[#161822] border-white/15 text-white'
                        }`}
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
                <div className={`text-[11px] ${mutedText}`}>
                  <p className={`font-bold ${titleText}`}>Vinculadas automaticamente:</p>
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
                  className={`sm:w-40 py-3 rounded-xl font-semibold text-xs cursor-pointer transition-colors ${secondaryBtnClass}`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Enviar Grade (PDF / Print Upload + AI Preview) */}
          {!pendingResult && activeMode === 'upload_document' && (
            <div className="space-y-4">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_DOCUMENT_INPUT_ACCEPT}
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Escolher arquivo PDF ou imagem da grade"
              />

              {/* State A: Analyzing Document Loading View */}
              {isAnalyzingDocument && (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="document-analyzing"
                  className={`p-8 rounded-2xl border text-center space-y-4 ${
                    isLight
                      ? 'bg-violet-50 border-violet-200'
                      : 'bg-violet-500/10 border-violet-500/30'
                  }`}
                >
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/25">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className={`text-base font-extrabold ${titleText}`}>
                      Analisando sua grade...
                    </h4>
                    <p className={`text-xs max-w-md mx-auto leading-relaxed ${mutedText}`}>
                      Lendo disciplinas, professores e prazos em{' '}
                      <span className="font-semibold">{analyzingFileName || 'seu arquivo'}</span>.
                      Isso leva apenas alguns segundos.
                    </p>
                  </div>
                  <div
                    className={`w-full max-w-xs mx-auto h-1.5 rounded-full overflow-hidden ${
                      isLight ? 'bg-violet-200' : 'bg-white/10'
                    }`}
                  >
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500 animate-pulse" />
                  </div>
                </div>
              )}

              {/* State B: Extracted Preview with Checkboxes */}
              {!isAnalyzingDocument && documentPreview && (
                <div className="space-y-4" data-testid="document-preview">
                  <div
                    className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 ${cardSurface}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isLight
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-violet-500/20 text-violet-300'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold truncate ${titleText}`}>
                          Prévia encontrada em {documentPreview.fileName}
                        </p>
                        <p className={`text-[11px] ${mutedText}`}>
                          Revise os itens marcados antes de salvar no seu painel.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 ${secondaryBtnClass}`}
                    >
                      Enviar outro arquivo
                    </button>
                  </div>

                  {/* Subjects Checklist */}
                  {documentPreview.subjects.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${titleText}`}
                        >
                          <BookOpen
                            className={`w-3.5 h-3.5 ${isLight ? 'text-violet-700' : 'text-violet-400'}`}
                          />
                          <span>
                            Disciplinas ({selectedSubjectIds.size} de {documentPreview.subjects.length})
                          </span>
                        </h4>
                        <button
                          type="button"
                          onClick={toggleAllSubjects}
                          className={`text-[11px] font-bold cursor-pointer hover:underline ${
                            isLight ? 'text-violet-700' : 'text-cyan-300'
                          }`}
                        >
                          {selectedSubjectIds.size === documentPreview.subjects.length
                            ? 'Desmarcar todas'
                            : 'Selecionar todas'}
                        </button>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {documentPreview.subjects.map((sub) => {
                          const checked = selectedSubjectIds.has(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${itemSurface}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSubjectSelection(sub.id)}
                                className="mt-0.5 w-4 h-4 rounded accent-violet-600 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-bold ${titleText}`}>
                                    {sub.nome}
                                  </span>
                                  {sub.codigo && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                        isLight
                                          ? 'bg-slate-200 text-slate-700'
                                          : 'bg-white/10 text-slate-200'
                                      }`}
                                    >
                                      {sub.codigo}
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      sub.matchedExistingSubjectId
                                        ? isLight
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-emerald-500/20 text-emerald-300'
                                        : isLight
                                        ? 'bg-violet-100 text-violet-800'
                                        : 'bg-violet-500/20 text-violet-200'
                                    }`}
                                  >
                                    {sub.matchedExistingSubjectId ? 'Já cadastrada' : 'Nova'}
                                  </span>
                                </div>
                                {sub.professor && (
                                  <p className={`text-[11px] mt-1 flex items-center gap-1 ${mutedText}`}>
                                    <User className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{sub.professor}</span>
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tasks / Deadlines Checklist */}
                  {documentPreview.tasks.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${titleText}`}
                        >
                          <CheckSquare
                            className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
                          />
                          <span>
                            Prazos e Atividades ({selectedTaskIds.size} de {documentPreview.tasks.length})
                          </span>
                        </h4>
                        <button
                          type="button"
                          onClick={toggleAllTasks}
                          className={`text-[11px] font-bold cursor-pointer hover:underline ${
                            isLight ? 'text-violet-700' : 'text-cyan-300'
                          }`}
                        >
                          {selectedTaskIds.size === documentPreview.tasks.length
                            ? 'Desmarcar todos'
                            : 'Selecionar todos'}
                        </button>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {documentPreview.tasks.map((task) => {
                          const checked = selectedTaskIds.has(task.id);
                          return (
                            <label
                              key={task.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${itemSurface}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="mt-0.5 w-4 h-4 rounded accent-violet-600 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className={`text-xs font-bold ${titleText}`}>
                                    {task.titulo}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold shrink-0 ${
                                      task.data_entrega
                                        ? isLight
                                          ? 'text-cyan-800'
                                          : 'text-cyan-300'
                                        : subtleText
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {task.data_entrega
                                        ? formatDateBR(task.data_entrega)
                                        : 'Sem data definida'}
                                    </span>
                                  </span>
                                </div>
                                {task.subjectNome && (
                                  <p
                                    className={`text-[11px] font-semibold ${
                                      isLight ? 'text-violet-700' : 'text-violet-300'
                                    }`}
                                  >
                                    {task.subjectNome}
                                  </p>
                                )}
                                {task.descricao && (
                                  <p className={`text-[11px] line-clamp-2 ${mutedText}`}>
                                    {task.descricao}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Save / Cancel Preview Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isLoading || totalSelectedCount === 0}
                      onClick={handleSaveDocumentPreview}
                      className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Salvando na sua conta...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Salvar no meu painel ({selectedSubjectIds.size}{' '}
                            {selectedSubjectIds.size === 1 ? 'disciplina' : 'disciplinas'}
                            {selectedTaskIds.size > 0
                              ? ` • ${selectedTaskIds.size} ${selectedTaskIds.size === 1 ? 'prazo' : 'prazos'}`
                              : ''}
                            )
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setDocumentPreview(null);
                        setSelectedSubjectIds(new Set());
                        setSelectedTaskIds(new Set());
                      }}
                      className={`sm:w-36 py-3 rounded-xl font-semibold text-xs cursor-pointer transition-colors disabled:opacity-50 ${secondaryBtnClass}`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* State C: Modern Drag & Drop Area */}
              {!isAnalyzingDocument && !documentPreview && (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    data-testid="document-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                      isDraggingOver
                        ? isLight
                          ? 'bg-violet-50 border-violet-600 scale-[1.01]'
                          : 'bg-violet-500/15 border-violet-400 scale-[1.01]'
                        : isLight
                        ? 'bg-slate-50 border-slate-300 hover:border-violet-500 hover:bg-violet-50/50'
                        : 'bg-white/[0.03] border-white/15 hover:border-violet-400/60 hover:bg-violet-500/[0.06]'
                    }`}
                  >
                    <div
                      className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                        isDraggingOver ? 'scale-110' : ''
                      } ${
                        isLight
                          ? 'bg-violet-100 border border-violet-200 text-violet-700'
                          : 'bg-violet-500/15 border border-violet-500/35 text-violet-300'
                      }`}
                    >
                      <Upload className="w-6 h-6" />
                    </div>

                    <h4 className={`text-base sm:text-lg font-extrabold tracking-tight ${titleText}`}>
                      Envie sua grade ou calendário
                    </h4>

                    <p className={`text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed ${mutedText}`}>
                      Aceita PDF do comprovante de matrícula ou print da tela do portal (Blackboard,
                      Canvas, Moodle, etc.).
                    </p>

                    <div className="mt-5 flex flex-col items-center gap-2.5">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/20">
                        <FileText className="w-4 h-4" />
                        <span>Escolher arquivo ou arrastar aqui</span>
                      </span>
                      <span className={`text-[11px] font-medium ${subtleText}`}>
                        Formatos aceitos: PDF, PNG, JPG ou WEBP • Máximo de 5 MB
                      </span>
                    </div>
                  </div>

                  {/* Official Store Extension Card — shown ONLY when VITE_EXTENSION_STORE_URL is a valid official store link */}
                  {officialExtensionStoreUrl && (
                    <div
                      data-testid="extension-store-card"
                      className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardSurface}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isLight
                              ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <Puzzle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-extrabold ${titleText}`}>
                            Prefere importar direto no navegador?
                          </p>
                          <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                            Sincronize suas disciplinas direto do portal da faculdade em 1 clique.
                          </p>
                        </div>
                      </div>

                      <a
                        href={officialExtensionStoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all shrink-0"
                      >
                        <span>Instalar Extensão (Chrome / Edge)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: Google Classroom (Official 1-Click Connection) */}
          {!pendingResult && activeMode === 'google_api' && (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-2xl space-y-4 ${cardSurface}`}
                data-testid="google-signin-panel"
              >
                <div className="space-y-1">
                  <h4 className={`text-sm font-extrabold ${titleText}`}>
                    Conecte sua conta do Google Classroom
                  </h4>
                  <p className={`text-xs leading-relaxed ${mutedText}`}>
                    Sincronize suas turmas e atividades em 1 clique com permissão somente de leitura,
                    sem salvar sua senha.
                  </p>
                </div>

                <ul className={`text-xs space-y-1.5 list-disc list-inside ${mutedText}`}>
                  <li>Importação automática de turmas e professores</li>
                  <li>Atividades e datas de entrega sempre atualizadas</li>
                  <li>Materiais de aula e avisos reunidos em um só lugar</li>
                </ul>

                {!googleClientId && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      isLight
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    A conexão direta com o Google não está ativa neste ambiente. Use a aba{' '}
                    <strong>Enviar Grade</strong> para importar seu PDF ou print do portal.
                  </div>
                )}

                <button
                  type="button"
                  disabled={isLoading || !googleClientId}
                  onClick={handleGoogleRedirect}
                  className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <svg aria-hidden="true" viewBox="0 0 48 48" className="w-4 h-4">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoading ? 'Conectando ao Google Classroom...' : 'Conectar com Google'}
                  </span>
                </button>

                {googleClientId && (
                  <div
                    className={`flex items-center justify-between gap-2 pt-2 border-t text-[11px] ${
                      isLight ? 'border-slate-200' : 'border-white/[0.08]'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isLoading || !googleReady}
                      onClick={handleGooglePopup}
                      className={`font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                        isLight
                          ? 'text-slate-600 hover:text-violet-700'
                          : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      {googleReady
                        ? 'Abrir em janela pop-up'
                        : googleLoadError
                        ? 'Pop-up indisponível'
                        : 'Preparando pop-up...'}
                    </button>
                    <span className={subtleText}>Conexão oficial Google OAuth</span>
                  </div>
                )}

                {googleLoadError && !errorMsg && (
                  <p className={`text-[11px] font-medium ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                    {googleLoadError}
                  </p>
                )}
              </div>

              {/* Ignored Google Classroom Courses */}
              {ignoredCourseNames.length > 0 && (
                <div
                  className={`p-4 rounded-2xl space-y-2 ${cardSurface}`}
                  data-testid="ignored-courses"
                >
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${subtleText}`}>
                    Turmas ignoradas ({ignoredCourseNames.length})
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>
                    Não são importadas nas sincronizações. Clique em &ldquo;Voltar a importar&rdquo;
                    para trazê-las novamente.
                  </p>
                  <ul className="space-y-1.5">
                    {ignoredCourseNames.map((name) => (
                      <li
                        key={name}
                        className={`flex items-center justify-between gap-2 text-xs ${titleText}`}
                      >
                        <span className="truncate font-medium">{name}</span>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleRestoreIgnored(name)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${secondaryBtnClass}`}
                        >
                          Voltar a importar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Progress Status (Google Classroom / Saving) */}
          {isLoading && !documentPreview && (
            <div
              role="status"
              aria-live="polite"
              data-testid="classroom-status"
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
                isLight
                  ? 'bg-violet-50 border-violet-200 text-violet-900'
                  : 'bg-violet-500/15 border-violet-500/35 text-violet-100'
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 animate-spin shrink-0 ${
                  isLight ? 'text-violet-700' : 'text-cyan-400'
                }`}
              />
              <span className="flex-1">{stepStatus}</span>
              {awaitingGoogle && (
                <button
                  type="button"
                  onClick={() => googleAbortRef.current?.abort()}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${secondaryBtnClass}`}
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
