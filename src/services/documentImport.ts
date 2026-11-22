import { supabase } from '../lib/supabase';
import type { CourseResolution } from '../context/PlannerContext';
import type { Subject } from '../types';
import { buildExtensionSubjectCode, inferPortalTaskType, parsePortugueseDate } from './academicParser';
import { normalizeText, stableHash } from './classroomImport';
import type { ClassroomSyncResult, ClassroomTaskDraft } from './classroomSync';

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AcceptedDocumentMimeType = (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number];

export const ACCEPTED_CLIPBOARD_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AcceptedClipboardImageMimeType = (typeof ACCEPTED_CLIPBOARD_IMAGE_MIME_TYPES)[number];

export const ACCEPTED_DOCUMENT_INPUT_ACCEPT =
  'application/pdf,image/png,image/jpeg,image/webp';

export const UNREADABLE_DOCUMENT_MESSAGE =
  'Não encontramos disciplinas ou prazos acadêmicos legíveis neste arquivo. Tente enviar o PDF do comprovante de matrícula, calendário acadêmico ou um print mais nítido da tela do seu portal.';

export interface ExtractedDocumentSubject {
  nome: string;
  codigo: string;
  professor: string;
}

export interface ExtractedDocumentTask {
  titulo: string;
  subjectNome: string;
  data_entrega: string | null;
  descricao: string;
}

export interface DocumentPreviewSubject extends ExtractedDocumentSubject {
  id: string;
  matchedExistingSubjectId?: string;
  matchedExistingSubjectName?: string;
}

export interface DocumentPreviewTask extends ExtractedDocumentTask {
  id: string;
}

export interface DocumentExtractionPreview {
  fileName: string;
  subjects: DocumentPreviewSubject[];
  tasks: DocumentPreviewTask[];
}

export type DocumentFileValidationResult =
  | { ok: true; mimeType: AcceptedDocumentMimeType }
  | { ok: false; error: string };

const ACCEPTED_MIME_SET = new Set<string>(ACCEPTED_DOCUMENT_MIME_TYPES);
const ACCEPTED_CLIPBOARD_IMAGE_SET = new Set<string>(ACCEPTED_CLIPBOARD_IMAGE_MIME_TYPES);

const CLIPBOARD_EXT_BY_MIME: Record<AcceptedClipboardImageMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface ClipboardItemLike {
  kind?: string;
  type?: string;
  getAsFile: () => File | Blob | null;
}

export interface ClipboardDataLike {
  items?: ArrayLike<ClipboardItemLike> | null;
  files?: ArrayLike<File | Blob> | null;
}

export interface AsyncClipboardItemLike {
  types: readonly string[];
  getType: (type: string) => Promise<Blob>;
}

export interface NavigatorClipboardLike {
  read?: () => Promise<AsyncClipboardItemLike[]>;
}

export type ClipboardReadOutcome =
  | { ok: true; file: File }
  | { ok: false; reason: 'unsupported' | 'permission_denied' | 'no_image'; message: string };

function normalizeClipboardImageMime(raw?: string | null): AcceptedClipboardImageMimeType | null {
  const lower = String(raw || '').trim().toLowerCase();
  if (lower === 'image/jpg') return 'image/jpeg';
  if (ACCEPTED_CLIPBOARD_IMAGE_SET.has(lower)) {
    return lower as AcceptedClipboardImageMimeType;
  }
  return null;
}

/**
 * Converts a clipboard image Blob (or File) into a normalized File ready for validateDocumentFile / extract_document.
 */
export function blobToClipboardImageFile(
  blob: Blob | File | null | undefined,
  explicitMimeType?: string
): File | null {
  if (!blob) return null;

  const existingName = 'name' in blob && typeof blob.name === 'string' ? blob.name.trim() : '';
  const mime =
    normalizeClipboardImageMime(explicitMimeType) ||
    normalizeClipboardImageMime(blob.type) ||
    normalizeClipboardImageMime(resolveDocumentMimeType({ type: blob.type, name: existingName }));

  if (!mime) return null;

  const ext = CLIPBOARD_EXT_BY_MIME[mime];
  const fileName =
    existingName && existingName.toLowerCase() !== 'image.png' && existingName.toLowerCase() !== 'blob'
      ? existingName
      : `print-grade.${ext}`;

  return new File([blob], fileName, {
    type: mime,
    lastModified: Date.now(),
  });
}

/**
 * Extracts the first supported image (PNG/JPEG/WEBP) from a paste event's clipboardData.
 */
export function extractImageFileFromClipboardData(
  clipboardData: ClipboardDataLike | null | undefined
): File | null {
  if (!clipboardData) return null;

  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || (item.kind && item.kind !== 'file')) continue;
      const mimeFromItem = normalizeClipboardImageMime(item.type);
      const raw = typeof item.getAsFile === 'function' ? item.getAsFile() : null;
      if (!raw) continue;
      const file = blobToClipboardImageFile(raw, mimeFromItem || raw.type);
      if (file) return file;
    }
  }

  const files = clipboardData.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const candidate = files[i];
      const file = blobToClipboardImageFile(candidate, candidate?.type);
      if (file) return file;
    }
  }

  return null;
}

/**
 * Reads an image screenshot from navigator.clipboard.read() with friendly Portuguese fallbacks
 * when the browser denies permission, does not support ClipboardItem read, or holds no image.
 */
export async function readImageFileFromNavigatorClipboard(
  clipboard: NavigatorClipboardLike | null | undefined =
    typeof navigator !== 'undefined' ? (navigator.clipboard as NavigatorClipboardLike | undefined) : null
): Promise<ClipboardReadOutcome> {
  if (!clipboard || typeof clipboard.read !== 'function') {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'Seu navegador não libera leitura automática pelo botão. Basta pressionar Ctrl+V nesta janela para colar seu print.',
    };
  }

  let items: AsyncClipboardItemLike[];
  try {
    items = await clipboard.read();
  } catch {
    return {
      ok: false,
      reason: 'permission_denied',
      message:
        'Permissão da área de transferência bloqueada pelo navegador. Basta pressionar Ctrl+V nesta janela para colar seu print.',
    };
  }

  for (const item of Array.isArray(items) ? items : []) {
    const types = Array.isArray(item?.types) ? item.types : [];
    const preferredOrder: AcceptedClipboardImageMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];
    const matchedType =
      preferredOrder.find((mime) => types.some((t) => normalizeClipboardImageMime(t) === mime)) ||
      types.find((t) => normalizeClipboardImageMime(t) !== null);

    if (!matchedType) continue;

    try {
      const blob = await item.getType(matchedType);
      const file = blobToClipboardImageFile(blob, matchedType);
      if (file) {
        return { ok: true, file };
      }
    } catch {
      // try next clipboard item
    }
  }

  return {
    ok: false,
    reason: 'no_image',
    message:
      'Nenhum print foi encontrado na área de transferência. Tire uma captura da tela do portal e clique novamente ou pressione Ctrl+V.',
  };
}

const EXTENSION_MIME_MAP: Record<string, AcceptedDocumentMimeType> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const SUBJECT_PALETTES = [
  { color: '#8b5cf6', accentColor: 'from-violet-500 to-indigo-600' },
  { color: '#06b6d4', accentColor: 'from-cyan-500 to-blue-600' },
  { color: '#10b981', accentColor: 'from-emerald-500 to-teal-600' },
  { color: '#f59e0b', accentColor: 'from-amber-500 to-orange-600' },
  { color: '#ec4899', accentColor: 'from-pink-500 to-rose-600' },
  { color: '#3b82f6', accentColor: 'from-blue-500 to-indigo-600' },
];

export function resolveDocumentMimeType(file: Pick<File, 'type' | 'name'>): string {
  const rawType = String(file.type || '').trim().toLowerCase();
  if (rawType === 'image/jpg') return 'image/jpeg';
  if (ACCEPTED_MIME_SET.has(rawType)) return rawType;

  const lowerName = String(file.name || '').trim().toLowerCase();
  for (const [ext, mime] of Object.entries(EXTENSION_MIME_MAP)) {
    if (lowerName.endsWith(ext)) return mime;
  }

  return rawType;
}

export function validateDocumentFile(
  file: Pick<File, 'type' | 'name' | 'size'>
): DocumentFileValidationResult {
  const mimeType = resolveDocumentMimeType(file);
  if (!ACCEPTED_MIME_SET.has(mimeType)) {
    return {
      ok: false,
      error: 'Formato não suportado. Envie um arquivo PDF ou imagem PNG, JPG ou WEBP.',
    };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return {
      ok: false,
      error: 'O arquivo selecionado está vazio. Escolha outro PDF ou imagem da sua grade.',
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      ok: false,
      error:
        'O arquivo excede o limite máximo de 5 MB. Envie um arquivo menor ou um print recortado da tela do portal.',
    };
  }

  return { ok: true, mimeType: mimeType as AcceptedDocumentMimeType };
}

export function readFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Não foi possível ler o arquivo selecionado.'));
        return;
      }
      const commaIdx = reader.result.indexOf(',');
      const base64 = commaIdx >= 0 ? reader.result.slice(commaIdx + 1) : reader.result;
      if (!base64.trim()) {
        reject(new Error('O arquivo selecionado está vazio.'));
        return;
      }
      resolve(base64.trim());
    };
    reader.onerror = () => {
      reject(new Error('Não foi possível ler o arquivo selecionado. Tente novamente.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Returns the official browser extension store URL ONLY when VITE_EXTENSION_STORE_URL
 * points to an official Chrome Web Store or Microsoft Edge Add-ons HTTPS listing
 * (never a .zip download or unofficial URL).
 */
export function getOfficialExtensionStoreUrl(rawUrl?: string): string | null {
  const candidate = String(
    rawUrl !== undefined ? rawUrl : (import.meta.env.VITE_EXTENSION_STORE_URL as string | undefined) || ''
  ).trim();
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (/\.zip(\b|$)/i.test(parsed.pathname) || /\.zip(\b|$)/i.test(parsed.search)) return null;

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  const isChromeWebStore =
    host === 'chromewebstore.google.com' ||
    (host === 'chrome.google.com' && path.startsWith('/webstore'));
  const isEdgeAddons =
    host === 'microsoftedge.microsoft.com' && path.startsWith('/addons');

  if (!isChromeWebStore && !isEdgeAddons) return null;

  return parsed.toString();
}

export function buildDocumentTaskKey(
  titulo: string,
  subjectNome: string,
  dataEntrega: string | null
): string {
  const datePart = dataEntrega && /^\d{4}-\d{2}-\d{2}$/.test(dataEntrega) ? dataEntrega : 'sem-data';
  return `doc:${stableHash(`${normalizeText(titulo)}|${normalizeText(subjectNome)}|${datePart}`)}`;
}

function normalizeExtractedDate(raw: unknown): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text || /^(null|undefined|sem data|sem prazo|-)$/i.test(text)) return null;
  const parsed = parsePortugueseDate(text);
  return parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null;
}

export function parseExtractedDocumentPayload(
  payload: unknown,
  existingSubjects: Pick<Subject, 'id' | 'name' | 'code'>[] = [],
  fileName = 'documento'
): DocumentExtractionPreview {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(UNREADABLE_DOCUMENT_MESSAGE);
  }

  const record = payload as Record<string, unknown>;
  const existingByNormName = new Map<string, Pick<Subject, 'id' | 'name' | 'code'>>();
  const existingByNormCode = new Map<string, Pick<Subject, 'id' | 'name' | 'code'>>();

  for (const sub of existingSubjects) {
    const normName = normalizeText(sub.name);
    const normCode = normalizeText(sub.code);
    if (normName) existingByNormName.set(normName, sub);
    if (normCode && !normCode.startsWith('ava ') && !normCode.startsWith('imp ')) {
      existingByNormCode.set(normCode, sub);
    }
  }

  const subjectMap = new Map<string, DocumentPreviewSubject>();
  const rawSubjects = Array.isArray(record.subjects) ? record.subjects : [];

  for (const item of rawSubjects) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const nome = String(s.nome ?? s.name ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    if (nome.length < 2) continue;

    const codigo = String(s.codigo ?? s.code ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32);
    const professor = String(s.professor ?? s.docente ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);

    const key = normalizeText(nome);
    if (!key) continue;

    const existingPreview = subjectMap.get(key);
    if (existingPreview) {
      if (codigo && !existingPreview.codigo) existingPreview.codigo = codigo;
      if (professor && !existingPreview.professor) existingPreview.professor = professor;
      continue;
    }

    const normCode = codigo ? normalizeText(codigo) : '';
    const matched =
      existingByNormName.get(key) || (normCode ? existingByNormCode.get(normCode) : undefined);

    subjectMap.set(key, {
      id: `doc-sub:${key}`,
      nome,
      codigo,
      professor,
      matchedExistingSubjectId: matched?.id,
      matchedExistingSubjectName: matched?.name,
    });
  }

  const tasks: DocumentPreviewTask[] = [];
  const seenTaskKeys = new Set<string>();
  const rawTasks = Array.isArray(record.tasks) ? record.tasks : [];

  for (const item of rawTasks) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const titulo = String(t.titulo ?? t.title ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    if (titulo.length < 2) continue;

    const rawSubjectNome = String(
      t.subjectNome ?? t.courseName ?? t.subjectName ?? t.disciplina ?? ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

    let canonicalSubjectNome = rawSubjectNome;
    if (rawSubjectNome) {
      const subKey = normalizeText(rawSubjectNome);
      if (subKey) {
        const existingPreview = subjectMap.get(subKey);
        if (existingPreview) {
          canonicalSubjectNome = existingPreview.nome;
        } else {
          const matched = existingByNormName.get(subKey);
          subjectMap.set(subKey, {
            id: `doc-sub:${subKey}`,
            nome: rawSubjectNome,
            codigo: '',
            professor: '',
            matchedExistingSubjectId: matched?.id,
            matchedExistingSubjectName: matched?.name,
          });
        }
      }
    }

    const data_entrega = normalizeExtractedDate(t.data_entrega ?? t.dueDate ?? t.prazo ?? null);
    const descricao = String(t.descricao ?? t.description ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);

    const taskKey = buildDocumentTaskKey(titulo, canonicalSubjectNome, data_entrega);
    if (seenTaskKeys.has(taskKey)) continue;
    seenTaskKeys.add(taskKey);

    tasks.push({
      id: taskKey,
      titulo,
      subjectNome: canonicalSubjectNome,
      data_entrega,
      descricao,
    });
  }

  const subjects = [...subjectMap.values()];
  if (subjects.length === 0 && tasks.length === 0) {
    throw new Error(UNREADABLE_DOCUMENT_MESSAGE);
  }

  return {
    fileName,
    subjects,
    tasks,
  };
}

export async function extractDocumentViaAI(
  file: File,
  existingSubjects: Pick<Subject, 'id' | 'name' | 'code'>[] = []
): Promise<DocumentExtractionPreview> {
  const validation = validateDocumentFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração do servidor ausente. Recarregue a página e tente novamente.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sua sessão expirou. Faça login novamente para importar sua grade.');
  }

  const fileBase64 = await readFileAsBase64(file);

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/ai-dicas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mode: 'extract_document',
        fileBase64,
        mimeType: validation.mimeType,
      }),
      signal: AbortSignal.timeout(35000),
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(
        'A análise demorou mais do que o esperado. Tente novamente com um arquivo menor ou um print mais recortado.'
      );
    }
    throw new Error('Erro de conexão ao analisar o arquivo. Verifique sua internet e tente novamente.');
  }

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new Error('Sua sessão expirou. Faça login novamente para importar sua grade.');
  }

  if (!res.ok) {
    const serverError =
      data && typeof data === 'object' && typeof (data as Record<string, unknown>).error === 'string'
        ? String((data as Record<string, unknown>).error)
        : '';
    throw new Error(serverError || UNREADABLE_DOCUMENT_MESSAGE);
  }

  return parseExtractedDocumentPayload(data, existingSubjects, file.name);
}

function makeDocumentSubjectDraft(
  draftId: string,
  nome: string,
  index: number,
  codigo?: string,
  professor?: string
): Subject {
  const palette = SUBJECT_PALETTES[index % SUBJECT_PALETTES.length];
  return {
    id: draftId,
    code: buildExtensionSubjectCode(nome, codigo),
    name: nome,
    professors: [professor?.trim() || 'Prof. Responsável'],
    progress: 0,
    totalHours: 80,
    completedHours: 0,
    studyTimeHours: 0,
    color: palette.color,
    accentColor: palette.accentColor,
    nextClass: '',
    schedule: '',
    room: '',
    description: '',
    topics: [],
    modules: [],
    materials: [],
    evaluations: [],
  };
}

/**
 * Converts checked subjects and tasks from the document preview into a ClassroomSyncResult +
 * explicit CourseResolution map ready for PlannerContext.applyClassroomSyncResult (with idempotent
 * subject & task deduplication in Supabase).
 */
export function buildDocumentSyncPayload(
  preview: DocumentExtractionPreview,
  selectedSubjectIds: Set<string>,
  selectedTaskIds: Set<string>,
  existingSubjects: Pick<Subject, 'id' | 'name' | 'code'>[] = []
): {
  result: ClassroomSyncResult;
  resolutions: Record<string, CourseResolution>;
} {
  const selectedSubjects = preview.subjects.filter((s) => selectedSubjectIds.has(s.id));
  const selectedTasks = preview.tasks.filter((t) => selectedTaskIds.has(t.id));

  if (selectedSubjects.length === 0 && selectedTasks.length === 0) {
    throw new Error('Selecione ao menos uma disciplina ou prazo para salvar no seu painel.');
  }

  const existingByNormName = new Map<string, Pick<Subject, 'id' | 'name' | 'code'>>();
  const existingById = new Map<string, Pick<Subject, 'id' | 'name' | 'code'>>();
  for (const sub of existingSubjects) {
    existingById.set(sub.id, sub);
    const normName = normalizeText(sub.name);
    if (normName) existingByNormName.set(normName, sub);
  }

  const drafts = new Map<string, Subject>();
  const draftIdByNormName = new Map<string, string>();
  const resolutions: Record<string, CourseResolution> = {};

  for (const sub of selectedSubjects) {
    const normName = normalizeText(sub.nome);
    if (!normName || draftIdByNormName.has(normName)) continue;

    const draftId = `doc-course:${normName}`;
    drafts.set(draftId, makeDocumentSubjectDraft(draftId, sub.nome, drafts.size, sub.codigo, sub.professor));
    draftIdByNormName.set(normName, draftId);

    const matchedExisting =
      (sub.matchedExistingSubjectId ? existingById.get(sub.matchedExistingSubjectId) : undefined) ||
      existingByNormName.get(normName);

    resolutions[draftId] = matchedExisting
      ? { action: 'link', subjectId: matchedExisting.id }
      : { action: 'create' };
  }

  const tasks: ClassroomTaskDraft[] = [];
  const FALLBACK_SUBJECT_NAME = 'Atividades Importadas';
  const FALLBACK_NORM = normalizeText(FALLBACK_SUBJECT_NAME);

  for (const task of selectedTasks) {
    const normSubject = task.subjectNome ? normalizeText(task.subjectNome) : '';
    let targetDraftId = normSubject ? draftIdByNormName.get(normSubject) : undefined;

    if (!targetDraftId && normSubject) {
      const matchedExisting = existingByNormName.get(normSubject);
      if (matchedExisting) {
        targetDraftId = `doc-course:${normSubject}`;
        if (!drafts.has(targetDraftId)) {
          drafts.set(
            targetDraftId,
            makeDocumentSubjectDraft(targetDraftId, matchedExisting.name, drafts.size, matchedExisting.code)
          );
          draftIdByNormName.set(normSubject, targetDraftId);
          resolutions[targetDraftId] = { action: 'link', subjectId: matchedExisting.id };
        }
      }
    }

    if (!targetDraftId) {
      targetDraftId = `doc-course:${FALLBACK_NORM}`;
      if (!drafts.has(targetDraftId)) {
        const existingFallback = existingByNormName.get(FALLBACK_NORM);
        drafts.set(
          targetDraftId,
          makeDocumentSubjectDraft(targetDraftId, FALLBACK_SUBJECT_NAME, drafts.size, 'GERAL')
        );
        draftIdByNormName.set(FALLBACK_NORM, targetDraftId);
        resolutions[targetDraftId] = existingFallback
          ? { action: 'link', subjectId: existingFallback.id }
          : { action: 'create' };
      }
    }

    const targetDraft = drafts.get(targetDraftId)!;
    const classroomId = buildDocumentTaskKey(task.titulo, task.subjectNome || targetDraft.name, task.data_entrega);
    const inferred = inferPortalTaskType(task.titulo, task.descricao);

    tasks.push({
      id: `doc-${classroomId}`,
      classroomId,
      turnedIn: false,
      title: task.titulo,
      subjectId: targetDraft.id,
      subjectName: targetDraft.name,
      dueDate: task.data_entrega || '',
      dueTime: '23:59',
      priority: inferred.priority,
      status: 'todo',
      type: inferred.type,
      isCriticalMvp: false,
      description: task.descricao || `Importado da grade (${targetDraft.name}).`,
      importedFromClassroom: true,
    });
  }

  return {
    result: {
      subjects: [...drafts.values()],
      tasks,
      stats: {
        coursesCount: drafts.size,
        tasksCount: tasks.length,
        materialsCount: 0,
        evaluationsCount: 0,
        announcementsCount: 0,
      },
      source: 'custom_import',
    },
    resolutions,
  };
}
