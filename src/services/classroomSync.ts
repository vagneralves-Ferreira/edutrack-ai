import type {
  Subject,
  Task,
  StudyMaterial,
  MaterialAttachment,
  SubjectModule,
  Evaluation,
  Priority,
  TaskStatus,
  TaskType,
} from '../types';
import { pastedTaskKey, normalizeText } from './classroomImport';

/** A Classroom activity ready to become a Kanban card. `subjectId` points to a course draft in `subjects`. */
export interface ClassroomTaskDraft extends Task {
  /** Stable dedupe key stored in tasks.classroom_id (gc:<courseId>:<workId>, json:..., paste:<hash>). */
  classroomId: string;
  /** Classroom reports the work as turned in or returned. */
  turnedIn: boolean;
}

export interface ClassroomSyncResult {
  /**
   * One draft per Classroom class. These are NOT the user's subjects: each draft is matched to a registered
   * subject, created, or ignored when the result is applied (see the "Turmas novas" review in the modal).
   */
  subjects: Subject[];
  tasks: ClassroomTaskDraft[];
  stats: {
    coursesCount: number;
    tasksCount: number;
    materialsCount: number;
    evaluationsCount: number;
    announcementsCount: number;
  };
  source: 'google_api' | 'apps_script' | 'custom_import';
  /** Apps Script only: false when the deployed script answers without checking the secret token. */
  scriptProtected?: boolean;
  /** Non-fatal problems to show the user (e.g. a class whose activities could not be read). */
  warnings?: string[];
  /** Google Classroom courseState per draft subject id (e.g. ACTIVE, PROVISIONED, ARCHIVED). */
  courseStates?: Record<string, string>;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toLocalDateString = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Classroom's dueDate/dueTime are in UTC (an activity due 23:59 in São Paulo is 02:59 UTC on the next day),
 * so convert them to the browser's local date and time.
 */
export function resolveClassroomDue(work: any, now: Date = new Date()): { dueDate: string; dueTime: string } {
  const dd = work?.dueDate;
  if (dd?.year) {
    const month = (dd.month || 1) - 1;
    const day = dd.day || 1;
    const t = work.dueTime;
    if (t && (typeof t.hours === 'number' || typeof t.minutes === 'number')) {
      const local = new Date(Date.UTC(dd.year, month, day, t.hours || 0, t.minutes || 0));
      return { dueDate: toLocalDateString(local), dueTime: `${pad2(local.getHours())}:${pad2(local.getMinutes())}` };
    }
    return { dueDate: `${dd.year}-${pad2(month + 1)}-${pad2(day)}`, dueTime: '23:59' };
  }
  // No due date in Classroom: use the publication date so the card still sorts sensibly.
  const created = work?.creationTime ? new Date(work.creationTime) : now;
  return { dueDate: toLocalDateString(isNaN(created.getTime()) ? now : created), dueTime: '23:59' };
}

export interface RawCourseBundle {
  course: any;
  teachers: any[];
  topics?: any[];
  courseWork: any[];
  submissions: any[];
  materials: any[];
  announcements: any[];
}

/** Placeholder replaced by the user's secret token when the script is copied (see buildAppsScriptCode). */
export const APPS_SCRIPT_TOKEN_PLACEHOLDER = '__EDUTRACK_TOKEN__';

/**
 * Apps Script bridge. The web app must be deployed as "Anyone" (a browser on another site cannot send the
 * user's Google cookies), so it only answers a POST whose body carries the secret token generated in EduTrack.
 * The token travels in the body, never in the URL, so it does not end up in history or request logs.
 */
export const APPS_SCRIPT_BRIDGE_CODE = `var EDUTRACK_TOKEN = '${APPS_SCRIPT_TOKEN_PLACEHOLDER}';

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  if (!EDUTRACK_TOKEN || EDUTRACK_TOKEN.indexOf('__') === 0 || body.token !== EDUTRACK_TOKEN) {
    return json_({ error: 'unauthorized', protected: true });
  }
  return json_({ generatedAt: new Date().toISOString(), protected: true, courses: readClassroom_() });
}

// GET never returns data: opening the URL in a browser shows only this message.
function doGet() {
  return json_({ error: 'use_post', protected: true });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function readClassroom_() {
  var resp = Classroom.Courses.list({ courseStates: ['ACTIVE'], pageSize: 30 });
  var courses = resp.courses || [];
  var result = courses.map(function(c) {
    var teachers = [];
    try { teachers = Classroom.Courses.Teachers.list(c.id).teachers || []; } catch (e) {}
    var topics = [];
    try { topics = Classroom.Courses.Topics.list(c.id).topic || []; } catch (e) {}
    var courseWork = [];
    try { courseWork = Classroom.Courses.CourseWork.list(c.id, { pageSize: 100 }).courseWork || []; } catch (e) {}
    var submissions = [];
    try { submissions = Classroom.Courses.CourseWork.StudentSubmissions.list(c.id, '-', { userId: 'me', pageSize: 100 }).studentSubmissions || []; } catch (e) {}
    var materials = [];
    try { materials = Classroom.Courses.CourseWorkMaterials.list(c.id, { pageSize: 50 }).courseWorkMaterial || []; } catch (e) {}
    var announcements = [];
    try { announcements = Classroom.Courses.Announcements.list(c.id, { pageSize: 20 }).announcements || []; } catch (e) {}
    return {
      course: c,
      teachers: teachers,
      topics: topics,
      courseWork: courseWork,
      submissions: submissions,
      materials: materials,
      announcements: announcements
    };
  });
  return result;
}`;

/** Script code with the user's token embedded (what "Copiar Script" puts on the clipboard). */
export function buildAppsScriptCode(token: string): string {
  return APPS_SCRIPT_BRIDGE_CODE.replace(APPS_SCRIPT_TOKEN_PLACEHOLDER, token);
}

/** 32 random bytes, base64url (≈43 chars). Generated in the browser; never sent anywhere but the user's script. */
export function generateAppsScriptToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SUBJECT_PALETTES = [
  { color: '#8b5cf6', accentColor: 'from-violet-500 to-indigo-600' },
  { color: '#06b6d4', accentColor: 'from-cyan-500 to-blue-600' },
  { color: '#10b981', accentColor: 'from-emerald-500 to-teal-600' },
  { color: '#f59e0b', accentColor: 'from-amber-500 to-orange-600' },
  { color: '#ec4899', accentColor: 'from-pink-500 to-rose-600' },
  { color: '#3b82f6', accentColor: 'from-blue-500 to-indigo-600' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function inferTaskType(title: string, description = ''): { type: TaskType; isCriticalMvp: boolean; priority: Priority } {
  const combined = `${title} ${description}`.toLowerCase();
  if (combined.includes('mvp') || combined.includes('entrega final') || combined.includes('projeto final')) {
    return { type: 'avaliacao_mvp', isCriticalMvp: true, priority: 'critica' };
  }
  if (combined.includes('prova') || combined.includes('avaliação') || combined.includes('avaliacao') || combined.includes('ap1') || combined.includes('ap2')) {
    return { type: 'avaliacao', isCriticalMvp: false, priority: 'alta' };
  }
  if (combined.includes('projeto') || combined.includes('trabalho') || combined.includes('ta:')) {
    return { type: 'projeto', isCriticalMvp: false, priority: 'alta' };
  }
  if (combined.includes('lab') || combined.includes('prática') || combined.includes('pratica')) {
    return { type: 'laboratorio', isCriticalMvp: false, priority: 'media' };
  }
  if (combined.includes('lista') || combined.includes('tarefas')) {
    return { type: 'lista', isCriticalMvp: false, priority: 'media' };
  }
  return { type: 'exercicio', isCriticalMvp: false, priority: 'media' };
}

/**
 * Normaliza e valida URLs externas (apenas http/https), descartando links vazios ou inseguros.
 */
export function sanitizeExternalUrl(raw?: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Extrai e deduplica anexos do Google Classroom (`driveFile`, `youtubeVideo`, `link`, `form`)
 * com fallback de URL do Google Drive por `driveFileId` e link opcional da postagem original.
 */
export function extractAttachments(rawList: any[] | undefined, postUrl?: string) {
  const fileAttachments: MaterialAttachment[] = [];
  const seenUrls = new Set<string>();
  let detectedFormat = 'Material Classroom';

  const pushUnique = (attachment: MaterialAttachment, formatLabel: string) => {
    const key = attachment.url.toLowerCase();
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    fileAttachments.push(attachment);
    if (detectedFormat === 'Material Classroom') detectedFormat = formatLabel;
  };

  for (const item of Array.isArray(rawList) ? rawList : []) {
    if (!item || typeof item !== 'object') continue;

    const df = item?.driveFile?.driveFile ?? (item?.driveFile?.id || item?.driveFile?.alternateLink ? item.driveFile : undefined);
    const driveFileId = df?.id ? String(df.id).trim() || undefined : undefined;
    const driveAlt = sanitizeExternalUrl(df?.alternateLink);
    const driveFallback = driveFileId ? `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view` : undefined;
    const driveUrl = driveAlt || driveFallback;
    if (driveUrl) {
      pushUnique(
        {
          title: String(df?.title || 'Arquivo no Google Drive').trim() || 'Arquivo no Google Drive',
          url: driveUrl,
          alternateLink: driveAlt || driveUrl,
          driveFileId,
          type: 'drive',
        },
        'Google Drive / PDF'
      );
    }

    const yt = item?.youtubeVideo;
    const ytUrl = sanitizeExternalUrl(yt?.alternateLink);
    if (ytUrl) {
      pushUnique(
        {
          title: String(yt?.title || 'Vídeo no YouTube').trim() || 'Vídeo no YouTube',
          url: ytUrl,
          alternateLink: ytUrl,
          type: 'youtube',
        },
        'Vídeo YouTube'
      );
    }

    const lk = item?.link;
    const lkUrl = sanitizeExternalUrl(lk?.url);
    if (lkUrl) {
      pushUnique(
        {
          title: String(lk?.title || lkUrl).trim() || lkUrl,
          url: lkUrl,
          alternateLink: lkUrl,
          type: 'link',
        },
        'Link Externo'
      );
    }

    const fm = item?.form;
    const fmUrl = sanitizeExternalUrl(fm?.formUrl);
    if (fmUrl) {
      pushUnique(
        {
          title: String(fm?.title || 'Formulário Google').trim() || 'Formulário Google',
          url: fmUrl,
          alternateLink: fmUrl,
          type: 'form',
        },
        'Formulário Google'
      );
    }
  }

  const attachments: MaterialAttachment[] = [...fileAttachments];
  const safePostUrl = sanitizeExternalUrl(postUrl);
  if (safePostUrl && !seenUrls.has(safePostUrl.toLowerCase())) {
    attachments.push({
      title: 'Abrir postagem original no Google Classroom',
      url: safePostUrl,
      alternateLink: safePostUrl,
      type: 'classroom',
    });
  }

  return {
    url: attachments[0]?.url || safePostUrl,
    fileAttachments,
    attachments,
    format: detectedFormat,
  };
}

/**
 * Constrói o resultado completo do EduTrack AI a partir de pacotes reais da API do Google Classroom
 * (usado tanto pela API REST OAuth quanto pelo Conector Google Apps Script).
 */
export function buildSyncResultFromCourseBundles(
  bundles: RawCourseBundle[],
  source: 'google_api' | 'apps_script'
): ClassroomSyncResult {
  const syncedSubjects: Subject[] = [];
  const syncedTasks: ClassroomTaskDraft[] = [];
  const courseStates: Record<string, string> = {};
  let totalMaterials = 0;
  let totalEvaluations = 0;
  let totalAnnouncements = 0;

  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i];
    const course = bundle.course || {};
    const courseId = String(course.id || `cls-${i}`);
    const courseName = String(course.name || 'Disciplina Classroom');
    const courseSection = course.section ? String(course.section) : '';
    const palette = SUBJECT_PALETTES[i % SUBJECT_PALETTES.length];

    // Course draft id; the real subject is resolved against the user's own subjects when applying.
    const subjectId = `gc-course:${courseId}`;
    if (course.courseState) {
      courseStates[subjectId] = String(course.courseState);
    }

    const rawTeachers = Array.isArray(bundle.teachers) ? bundle.teachers : [];
    const teachersList: string[] = rawTeachers
      .map((t: any) => (typeof t === 'string' ? t : t?.profile?.name?.fullName))
      .filter(Boolean)
      .map((name: string) => (name.toLowerCase().startsWith('prof') ? name : `Prof. ${name}`));

    const rawTopics: any[] = Array.isArray(bundle.topics) ? bundle.topics : [];
    const topicNames = rawTopics.map((t: any) => String(t.name));

    const modules: SubjectModule[] = rawTopics.map((t: any, idx: number) => ({
      id: `mod-${courseId}-${t.topicId || idx}`,
      number: idx + 1,
      title: String(t.name),
      hours: Math.round(80 / Math.max(1, rawTopics.length)),
      description: `Tópico oficial importado da turma ${courseName} no Google Classroom.`,
      topics: [String(t.name)],
    }));

    const submissionMap = new Map<string, any>();
    for (const sub of bundle.submissions || []) {
      if (sub?.courseWorkId) {
        submissionMap.set(String(sub.courseWorkId), sub);
      }
    }

    const courseWorkList: any[] = Array.isArray(bundle.courseWork) ? bundle.courseWork : [];
    const evaluations: Evaluation[] = [];
    const materials: StudyMaterial[] = [];
    let completedWorkCount = 0;

    for (const work of courseWorkList) {
      const workId = String(work.id);
      const workTitle = String(work.title || 'Atividade Classroom');
      const workDesc = String(work.description || 'Atividade sincronizada diretamente do Google Classroom.');
      const sub = submissionMap.get(workId);

      // Only "turned in"/"returned" changes the Kanban status; CREATED is just "assigned, not turned in yet".
      const turnedIn = sub?.state === 'TURNED_IN' || sub?.state === 'RETURNED';
      const status: TaskStatus = turnedIn ? 'completed' : 'todo';
      if (turnedIn) completedWorkCount++;

      const { dueDate, dueTime } = resolveClassroomDue(work);

      const inferred = inferTaskType(workTitle, workDesc);
      const extractedWork = extractAttachments(work.materials, work.alternateLink);
      const workClassroomId = `gc:${courseId}:${workId}`;

      syncedTasks.push({
        id: `classroom-${courseId}-${workId}`,
        classroomId: workClassroomId,
        turnedIn,
        title: workTitle,
        subjectId,
        subjectName: courseName,
        dueDate,
        dueTime,
        priority: inferred.priority,
        status,
        type: inferred.type,
        isCriticalMvp: inferred.isCriticalMvp,
        description: work.alternateLink ? `${workDesc} • Link: ${work.alternateLink}` : workDesc,
        importedFromClassroom: true,
        attachments: extractedWork.attachments,
      });

      if (extractedWork.fileAttachments.length > 0) {
        materials.push({
          id: `cw-${courseId}-${workId}`,
          classroomId: workClassroomId,
          title: workTitle,
          category: 'apostila',
          format: extractedWork.format,
          description: workDesc,
          badge: 'Atividade Classroom',
          url: extractedWork.url,
          attachments: extractedWork.attachments,
        });
        totalMaterials++;
      }

      if (work.maxPoints || inferred.type === 'avaliacao' || inferred.type === 'avaliacao_mvp' || inferred.type === 'projeto') {
        const assignedGrade =
          typeof sub?.assignedGrade === 'number'
            ? work.maxPoints && work.maxPoints > 10
              ? Number(((sub.assignedGrade / work.maxPoints) * 10).toFixed(1))
              : Number(sub.assignedGrade.toFixed(1))
            : undefined;

        const [yyyy, mm, dd] = dueDate.split('-');
        evaluations.push({
          id: `eval-${courseId}-${workId}`,
          name: workTitle,
          date: dd && mm ? `${dd}/${mm}/${yyyy}` : yyyy,
          weight: work.maxPoints ? Math.min(100, Number(work.maxPoints)) : 25,
          status: status === 'completed' ? 'completed' : 'pending',
          grade: assignedGrade,
          url: extractedWork.url,
          attachments: extractedWork.attachments,
        });
        totalEvaluations++;
      }
    }

    for (const mat of bundle.materials || []) {
      const extracted = extractAttachments(mat.materials, mat.alternateLink);

      materials.push({
        id: `mat-${courseId}-${mat.id}`,
        title: String(mat.title || 'Material de Aula'),
        category: 'apostila',
        format: extracted.format,
        description: String(mat.description || `Publicado na turma ${courseName} no Google Classroom.`),
        badge: 'Classroom',
        url: extracted.url,
        attachments: extracted.attachments,
      });
      totalMaterials++;
    }

    for (const ann of (bundle.announcements || []).slice(0, 8)) {
      const cleanText = String(ann.text || '').trim();
      if (!cleanText) continue;
      const extracted = extractAttachments(ann.materials, ann.alternateLink);
      materials.push({
        id: `ann-${courseId}-${ann.id}`,
        title: `Aviso do Mural: ${cleanText.slice(0, 58)}${cleanText.length > 58 ? '...' : ''}`,
        category: 'artigo',
        format: 'Mural do Professor',
        description: cleanText,
        badge: 'Mural Classroom',
        url: extracted.url,
        attachments: extracted.attachments,
      });
      totalAnnouncements++;
    }

    const totalWork = courseWorkList.length;
    const progress = totalWork > 0 ? Math.round((completedWorkCount / totalWork) * 100) : 0;
    const totalHours = 80;
    const completedHours = Math.round((progress / 100) * totalHours);

    syncedSubjects.push({
      id: subjectId,
      code: courseSection || `CLS-${courseId.slice(-4)}`,
      name: courseName,
      professors: teachersList.length > 0 ? teachersList : ['Prof. Responsável'],
      progress,
      totalHours,
      completedHours,
      studyTimeHours: 0,
      color: palette.color,
      accentColor: palette.accentColor,
      nextClass: course.room ? `${course.room} • 19:15` : 'Google Classroom',
      schedule: courseSection ? `${courseSection}` : 'Google Classroom',
      room: course.room || 'Google Classroom',
      description:
        course.descriptionHeading ||
        course.description ||
        `Turma sincronizada do Google Classroom (${courseName}).`,
      topics: topicNames,
      modules,
      materials,
      evaluations,
    });
  }

  return {
    subjects: syncedSubjects,
    tasks: syncedTasks,
    stats: {
      coursesCount: syncedSubjects.length,
      tasksCount: syncedTasks.length,
      materialsCount: totalMaterials,
      evaluationsCount: totalEvaluations,
      announcementsCount: totalAnnouncements,
    },
    source,
    courseStates,
  };
}

/**
 * Conecta via Web App pessoal do Google Apps Script (https://script.google.com/macros/s/.../exec)
 * que lê diretamente Classroom.Courses, Teachers, CourseWork, Submissions, Materials e Announcements.
 */
export async function fetchGoogleAppsScriptClassroom(webAppUrl: string, token: string): Promise<ClassroomSyncResult> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl.startsWith('https://script.google.com/')) {
    throw new Error('Informe uma URL válida do Google Apps Script começando com https://script.google.com/macros/s/...');
  }
  if (!token.trim()) {
    throw new Error('Gere o token secreto, copie o script atualizado para o Apps Script e publique uma nova versão antes de sincronizar.');
  }

  // text/plain keeps this a "simple" request (no CORS preflight, which Apps Script does not answer).
  const res = await fetch(cleanUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: token.trim() }),
  });
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status} ao consultar o Conector Apps Script. Verifique se a implantação está ativa para "Qualquer pessoa".`);
  }

  let json: any = await res.json().catch(() => null);
  let scriptProtected = json?.protected === true;

  if (json?.error === 'unauthorized') {
    throw new Error(
      'O script recusou o token. Copie o script de novo (ele já leva o token atual), cole no Apps Script e publique em Implantar → Gerenciar implantações → Editar → Nova versão.'
    );
  }

  // Old script without doPost: Apps Script answers the POST with an HTML error page. Fall back to the
  // legacy GET so the import still works, but flag the script as open.
  if (!json) {
    const legacy = await fetch(cleanUrl, { method: 'GET', redirect: 'follow' }).catch(() => null);
    json = legacy && legacy.ok ? await legacy.json().catch(() => null) : null;
    scriptProtected = false;
  }

  const bundles: RawCourseBundle[] = Array.isArray(json?.courses) ? json.courses : Array.isArray(json) ? json : [];
  if (bundles.length === 0) {
    throw new Error('O Conector Apps Script respondeu sem turmas. Confira se a conta logada no Apps Script possui turmas ativas no Google Classroom.');
  }

  return { ...buildSyncResultFromCourseBundles(bundles, 'apps_script'), scriptProtected };
}

export class ClassroomApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CLASSROOM_API = 'https://classroom.googleapis.com/v1';

async function classroomGet(path: string, accessToken: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${CLASSROOM_API}/${path}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ClassroomApiError(res.status, String(body?.error?.message || `HTTP ${res.status}`));
  }
  return res.json();
}

/** Follows nextPageToken so no course, activity or submission is left behind (capped as a safety net). */
export async function classroomListAll(
  path: string,
  key: string,
  accessToken: string,
  params: Record<string, string> = {},
  maxPages = 25
): Promise<any[]> {
  const items: any[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const data = await classroomGet(path, accessToken, { ...params, ...(pageToken ? { pageToken } : {}) });
    if (Array.isArray(data?.[key])) items.push(...data[key]);
    pageToken = data?.nextPageToken || undefined;
    pages++;
  } while (pageToken && pages < maxPages);
  return items;
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface ClassroomApiGrants {
  materials: boolean;
  announcements: boolean;
  rosters: boolean;
}

const SESSION_EXPIRED =
  'A autorização do Google expirou ou foi revogada. Clique em "Entrar com Google" de novo.';

/**
 * Reads the student's Classroom through the official REST API (v1) with a short-lived OAuth access token.
 * Courses and activities/submissions are required; materials, announcements and teacher names are read only
 * when the matching permission was granted. Problems are reported in `warnings` instead of being swallowed.
 */
export async function fetchGoogleClassroomFullData(
  accessToken: string,
  grants: ClassroomApiGrants = { materials: true, announcements: true, rosters: true },
  onProgress?: (message: string) => void
): Promise<ClassroomSyncResult> {
  const token = accessToken.trim();
  if (!token) throw new Error(SESSION_EXPIRED);

  let courses: any[];
  onProgress?.('Lendo suas turmas no Google Classroom...');
  try {
    const allCourses = await classroomListAll('courses', 'courses', token, { pageSize: '100' });
    courses = allCourses.filter((c) => c?.courseState !== 'DECLINED' && c?.courseState !== 'SUSPENDED');
  } catch (err) {
    if (err instanceof ClassroomApiError && err.status === 401) throw new Error(SESSION_EXPIRED);
    if (err instanceof ClassroomApiError && err.status === 403) {
      throw new Error(
        `O Google negou acesso às turmas (403: ${err.message}). Confira se a Google Classroom API está ativada no projeto e se a sua conta permite o acesso.`
      );
    }
    throw err;
  }
  if (courses.length === 0) {
    throw new Error('Nenhuma turma ativa foi encontrada nesta conta do Google Classroom.');
  }

  const warnings: string[] = [];
  const failedCourses: string[] = [];
  const optionalFailures = new Set<string>();
  const total = courses.length;
  let done = 0;
  const courseLabel = `${total} turma${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`;
  onProgress?.(`${courseLabel}. Lendo atividades e entregas (0 de ${total})...`);
  const markCourseDone = () => {
    done++;
    onProgress?.(`${courseLabel}. Lendo atividades e entregas (${done} de ${total})...`);
  };

  const optional = async (label: string, run: () => Promise<any[]>): Promise<any[]> => {
    try {
      return await run();
    } catch (err) {
      if (err instanceof ClassroomApiError && err.status === 401) throw new Error(SESSION_EXPIRED);
      optionalFailures.add(label);
      return [];
    }
  };

  const bundles = await mapWithLimit(courses, 3, async (course): Promise<RawCourseBundle> => {
    const id = encodeURIComponent(String(course.id));
    let courseWorkFailed = false;

    const readWorkOrEmpty = async (label: string, run: () => Promise<any[]>): Promise<any[]> => {
      try {
        return await run();
      } catch (err) {
        if (err instanceof ClassroomApiError && err.status === 401) throw new Error(SESSION_EXPIRED);
        if (!courseWorkFailed) {
          courseWorkFailed = true;
          failedCourses.push(`${course.name || course.id} (${label}${err instanceof ClassroomApiError ? `: ${err.status}` : ''})`);
        }
        return [];
      }
    };

    const [courseWork, submissions] = await Promise.all([
      readWorkOrEmpty('atividades', () => classroomListAll(`courses/${id}/courseWork`, 'courseWork', token, { pageSize: '100' })),
      readWorkOrEmpty('entregas', () =>
        classroomListAll(`courses/${id}/courseWork/-/studentSubmissions`, 'studentSubmissions', token, {
          userId: 'me',
          pageSize: '100',
        })
      ),
    ]);

    const [teachers, materials, announcements] = await Promise.all([
      grants.rosters
        ? optional('nomes dos professores', () => classroomListAll(`courses/${id}/teachers`, 'teachers', token, { pageSize: '30' }))
        : Promise.resolve([]),
      grants.materials
        ? optional('materiais', () =>
            classroomListAll(`courses/${id}/courseWorkMaterials`, 'courseWorkMaterial', token, { pageSize: '100' })
          )
        : Promise.resolve([]),
      grants.announcements
        ? optional('avisos', () =>
            // Only the 20 most recent announcements: one page is enough.
            classroomListAll(`courses/${id}/announcements`, 'announcements', token, { pageSize: '20', orderBy: 'updateTime desc' }, 1)
          )
        : Promise.resolve([]),
    ]);

    markCourseDone();
    return { course, teachers, topics: [], courseWork, submissions, materials, announcements };
  });

  if (failedCourses.length > 0) {
    warnings.push(`Algumas atividades não puderam ser lidas em: ${failedCourses.join(', ')}. As turmas foram mantidas na lista.`);
  }
  if (optionalFailures.size > 0) {
    warnings.push(`Algumas informações extras não puderam ser lidas (${[...optionalFailures].join(', ')}); as atividades foram importadas normalmente.`);
  }

  return { ...buildSyncResultFromCourseBundles(bundles, 'google_api'), warnings };
}

function parsePortugueseDate(text: string): string | null {
  // ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // DD/MM/YYYY, DD/MM/YY, DD/MM or DD-MM-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const dayNum = Number(slashMatch[1]);
    const monthNum = Number(slashMatch[2]);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      const day = slashMatch[1].padStart(2, '0');
      const month = slashMatch[2].padStart(2, '0');
      const yearRaw = slashMatch[3];
      const year = yearRaw ? (yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : String(new Date().getFullYear());
      return `${year}-${month}-${day}`;
    }
  }

  // "07 de nov.", "19 de novembro de 2026", "15 nov 2026", "15 nov."
  const monthsMap: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };
  const ptMatch = text
    .toLowerCase()
    .match(/\b(\d{1,2})\s+(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç.]*(?:\s+(?:de\s+)?(20\d{2}))?\b/i);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const prefix = ptMatch[2].slice(0, 3).toLowerCase();
    if (monthsMap[prefix]) {
      const year = ptMatch[3] || String(new Date().getFullYear());
      return `${year}-${monthsMap[prefix]}-${day}`;
    }
  }
  return null;
}

const CODE_LINE_PATTERNS = [
  /^\s*(var|const|let|function|return|import|export|class|try|catch|finally|for|while|switch|if|else)\b/i,
  /^\s*(\/\/|\/\*|\*\/|[{}[\]();.,]+)\s*$/,
  /^\s*<\/?[a-z][\w-]*[\s>]/i,
  /Classroom\.Courses|ContentService\.createTextOutput|function\s+doGet\s*\(|setMimeType\(|new\s+Date\(\)\.toISOString\(\)/i,
  /=>\s*\{|\|\|\s*\[\s*\]\s*;|\}\s*\)\s*;?\s*$/,
  /^\s*(course|teachers|topics|courseWork|submissions|materials|announcements|generatedAt|courses)\s*:\s*[a-zA-Z0-9_.()[\]\s]+,?\s*$/i,
  /^\s*[a-z_$][\w$]*\s*:\s*[a-z_$][\w$]*\s*,\s*$/i,
];

export function isCodeSnippetLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return CODE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isCorruptedCodeTask(task: Pick<Task, 'title'>): boolean {
  return isCodeSnippetLine(task.title || '');
}

function looksLikeSourceCode(rawContent: string): boolean {
  if (/Classroom\.Courses\.list|ContentService\.createTextOutput|function\s+doGet\s*\(/i.test(rawContent)) {
    return true;
  }
  const nonEmptyLines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (nonEmptyLines.length === 0) return false;
  const codeLines = nonEmptyLines.filter(isCodeSnippetLine).length;
  return codeLines >= 2 && codeLines / nonEmptyLines.length >= 0.25;
}


const UNASSIGNED_COURSE_NAME = 'Atividades sem turma identificada';

function makeCourseDraft(id: string, name: string, index: number, code?: string): Subject {
  const palette = SUBJECT_PALETTES[index % SUBJECT_PALETTES.length];
  return {
    id,
    code: code || `AVA-${slugify(name).slice(0, 8).toUpperCase() || 'TURMA'}`,
    name,
    professors: ['Prof. Responsável'],
    progress: 0,
    totalHours: 80,
    completedHours: 0,
    studyTimeHours: 0,
    color: palette.color,
    accentColor: palette.accentColor,
    nextClass: 'AVA / Portal',
    schedule: 'AVA / Portal',
    room: 'AVA / Portal',
    description: `Disciplina importada do AVA / Portal (${name}).`,
    topics: [],
    modules: [],
    materials: [],
    evaluations: [],
  };
}

interface RawPastedItem {
  title: string;
  courseName: string | null;
  courseCode?: string;
  dueDate: string | null;
  turnedIn: boolean;
  urgent?: boolean;
  description?: string;
  explicitKey?: string;
}

/** Groups pasted items by class (course drafts) and gives each one a stable dedupe key. */
function buildResultFromPastedItems(
  items: RawPastedItem[],
  extraSubjects: Array<{ name: string; code?: string }> = []
): ClassroomSyncResult {
  const today = toLocalDateString(new Date());
  const drafts = new Map<string, Subject>();
  const tasks: ClassroomTaskDraft[] = [];

  for (const sub of extraSubjects) {
    const cleanName = sub.name.trim();
    if (!cleanName) continue;
    const draftId = `paste-course:${normalizeText(cleanName)}`;
    if (!drafts.has(draftId)) {
      drafts.set(draftId, makeCourseDraft(draftId, cleanName, drafts.size, sub.code));
    }
  }

  for (const item of items) {
    const courseName = item.courseName?.trim() || '';
    const draftId = courseName ? `paste-course:${normalizeText(courseName)}` : 'paste-course:unassigned';
    if (!drafts.has(draftId)) {
      drafts.set(draftId, makeCourseDraft(draftId, courseName || UNASSIGNED_COURSE_NAME, drafts.size, item.courseCode));
    }
    const draft = drafts.get(draftId)!;
    const inferred = inferTaskType(item.title, item.description || '');
    const classroomId = item.explicitKey || pastedTaskKey(item.title, courseName, item.dueDate || 'sem-data');

    tasks.push({
      id: `classroom-${classroomId}`,
      classroomId,
      turnedIn: item.turnedIn,
      title: item.title,
      subjectId: draft.id,
      subjectName: draft.name,
      dueDate: item.dueDate || today,
      dueTime: '23:59',
      priority: item.urgent ? 'alta' : inferred.priority,
      status: item.turnedIn ? 'completed' : 'todo',
      type: inferred.type,
      isCriticalMvp: false,
      description: item.description || `Importado do AVA / Portal${courseName ? ` (${courseName})` : ''}.`,
      importedFromClassroom: true,
    });
  }

  return {
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
  };
}

/**
 * Parses text copied from the Google Classroom pages ("Pendentes" / "Atividades") or a JSON export.
 * Classes are only recognised when they match one of the user's subjects by name/code; activities without
 * a recognisable class go to an "unassigned" draft so the user decides where they belong (no silent guess).
 * Never mixes in sample data.
 */
export function parseClassroomPastedContent(rawContent: string, existingSubjects: Subject[]): ClassroomSyncResult {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('Cole o conteúdo copiado do seu AVA (Blackboard, Portal do Aluno, Classroom, Canvas, Moodle) ou um JSON válido.');
  }

  if (looksLikeSourceCode(trimmed)) {
    throw new Error(
      'O texto colado parece ser código JavaScript/Apps Script, não a lista de disciplinas ou atividades. Abra seu AVA (Blackboard, Portal do Aluno ou Google Classroom), copie o conteúdo da página (Ctrl+A → Ctrl+C) e cole aqui.'
    );
  }

  // Case 1: JSON (Apps Script connector output or a structured export)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = null; // fall through to the free-text parser
    }
    if (parsed) {
      if (Array.isArray(parsed?.courses) && parsed.courses[0]?.course) {
        return buildSyncResultFromCourseBundles(parsed.courses, 'apps_script');
      }
      const list = Array.isArray(parsed) ? parsed : parsed.tasks || parsed.courseWork || [];
      if (Array.isArray(list) && list.length > 0) {
        const items: RawPastedItem[] = list.map((item: any, idx: number) => {
          const courseName = item.courseName || item.subjectName || item.turma || null;
          const rawId = item.id ?? item.courseWorkId;
          return {
            title: String(item.title || item.titulo || item.name || `Atividade AVA #${idx + 1}`),
            courseName: courseName ? String(courseName) : null,
            dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : null,
            turnedIn:
              item.status === 'completed' || item.status === 'done' || item.state === 'TURNED_IN' || item.state === 'RETURNED',
            description: item.description ? String(item.description) : undefined,
            explicitKey:
              rawId != null && rawId !== ''
                ? `json:${item.courseId ?? normalizeText(String(courseName || '')).replace(/ /g, '-')}:${rawId}`
                : undefined,
          };
        });
        return buildResultFromPastedItems(items);
      }
    }
  }

  // Case 2: text copied straight from Google Classroom, Blackboard, Área do Aluno (UNICID/Cruzeiro do Sul), Canvas or Moodle
  const NOISE_LINE_REGEX =
    /^(pular para o conte[úu]do.*|google\s*(sala de aula|classroom)|blackboard(\s+learn)?|canvas|moodle|[áa]rea do aluno|portal do aluno|p[áa]gina da institui[çc][ãa]o|fluxo de atividades|menu principal|pendentes?|conclu[ií]das?|atribu[ií]d[ao]s?|todas as turmas|turmas|cursos(\s+atuais)?|todos os cursos|meus cursos|minhas disciplinas|disciplinas|organiza[çc][õo]es|calend[áa]rio|mensagens|ferramentas|sair|acessibilidade|privacidade|termos|pesquisar cursos.*|filtro|filtros|aberto|fechado|privado|m[óo]dulos|avisos|agenda|para fazer|inscrito|configura[çc][õo]es|ajuda|feedback|sem data.*|sem prazo|hoje|amanh[ãa]|pr[óo]xim[oa]s?|esta semana|pr[oó]xima semana|mais tarde|anteriores|ver tudo|ver detalhes|visualizar|carregar mais|nenhuma atividade|nenhum trabalho|nenhum material|mural|atividades|pessoas|notas|criar|postado em.*|editado.*|data de entrega:?|cruzeiro do sul(\s+educacional)?|unicid|v[áa]rios instrutores|\d{1,2}:\d{2})$/i;

  const EXPLICIT_SUBJECT_REGEX = /^(?:disciplina|curso|mat[ée]ria|turma)\s*[:\-–]\s*(.{3,100})$/i;
  const CODE_AND_SUBJECT_REGEX =
    /^((?:20\d{2}[._-]?\d?[._-]?)?(?:[A-Z]{2,8}[._-])*[A-Z]{2,8}[._-]?\d{2,6}(?:[._-][A-Z0-9]+)*|\d{5,9}(?:[._-]\d{1,4})?|20\d{2}[./-][12])\s*[-–—•|:]\s*(.{4,100})$/;
  const STANDALONE_COURSE_CODE_REGEX =
    /^(?:20\d{2}[._-]\d[._-][A-Z0-9._-]{2,}|[A-Z]{2,6}[_-]\d{2,6}(?:[_-][A-Z0-9]+)*|\d{5,9}[_-][A-Z0-9_-]{2,})$/;
  const DATE_ONLY_LABEL_REGEX =
    /^(?:(?:data de entrega|entrega|prazo|vence em|vencimento|due(?:\s+date)?)\s*[:\-–]?\s*)?(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:de\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç.]*(?:\s+(?:de\s+)?20\d{2})?)(?:\s*(?:[àa]s|-|•|,)?\s*\d{1,2}:\d{2}(?::\d{2})?)?$/i;

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[A-ZÀ-Ú]$/.test(l));

  const items: RawPastedItem[] = [];
  const discoveredSubjects = new Map<string, { name: string; code?: string }>();
  let currentSubject: { name: string; code?: string } | null = null;
  let currentTurnedIn = false;
  let pendingDueDate: string | null = null;

  const registerSubject = (name: string, code?: string) => {
    const cleanName = name.replace(/\s+/g, ' ').trim();
    if (cleanName.length < 3) return null;
    const key = normalizeText(cleanName);
    if (!discoveredSubjects.has(key)) {
      discoveredSubjects.set(key, { name: cleanName, code });
    }
    return discoveredSubjects.get(key)!;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(conclu[ií]da|entregue|devolvida|enviado|nota\b)/i.test(line)) {
      if (items.length > 0 && /entregue|devolvida|enviado/i.test(line)) {
        items[items.length - 1].turnedIn = true;
      } else {
        currentTurnedIn = true;
      }
      continue;
    }
    if (/^(atribu[ií]d[ao]|pendente|a fazer|em aberto|com atraso|atrasad[oa]|n[ãa]o enviado)/i.test(line)) {
      if (items.length > 0 && /com atraso|atrasad[oa]|pendente/i.test(line)) {
        items[items.length - 1].urgent = true;
      } else {
        currentTurnedIn = false;
      }
      continue;
    }

    // 1. Explicit subject label ("Disciplina: Anatomia Humana", "Curso: ...")
    const explicitSubject = line.match(EXPLICIT_SUBJECT_REGEX);
    if (explicitSubject) {
      const sub = registerSubject(explicitSubject[1]);
      if (sub) currentSubject = sub;
      continue;
    }

    // 2. Blackboard / Portal line combining course code + subject name ("20262_BIO_101 - Anatomia Humana")
    const codeAndSubject = line.match(CODE_AND_SUBJECT_REGEX);
    if (codeAndSubject && !parsePortugueseDate(codeAndSubject[1])) {
      const code = codeAndSubject[1].trim();
      const subName = codeAndSubject[2].trim();
      const sub = registerSubject(subName, code);
      if (sub) currentSubject = sub;
      continue;
    }

    // 3. Standalone Blackboard course code ("20262_GRAD_BIO_101") followed by subject name on next line
    if (STANDALONE_COURSE_CODE_REGEX.test(line)) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (
          !NOISE_LINE_REGEX.test(nextLine) &&
          !DATE_ONLY_LABEL_REGEX.test(nextLine) &&
          !isCodeSnippetLine(nextLine)
        ) {
          const sub = registerSubject(nextLine, line);
          if (sub) currentSubject = sub;
          i++;
        }
      }
      continue;
    }

    // 4. A short line naming one of the user's existing subjects is a class header (or the class of the previous card).
    const matchedSub = existingSubjects.find(
      (s) =>
        line.toLowerCase().includes(s.name.toLowerCase()) ||
        (s.code && line.toLowerCase().includes(s.code.toLowerCase()))
    );
    if (matchedSub && line.length <= matchedSub.name.length + 20) {
      if (items.length > 0 && i > 0 && !NOISE_LINE_REGEX.test(lines[i - 1])) {
        const last = items[items.length - 1];
        if (!last.courseName) {
          last.courseName = matchedSub.name;
          last.courseCode = matchedSub.code;
        }
      }
      currentSubject = { name: matchedSub.name, code: matchedSub.code };
      continue;
    }

    if (NOISE_LINE_REGEX.test(line) || isCodeSnippetLine(line)) {
      continue;
    }

    // 5. A date-only line ("Entrega: 25/11/2026 23:59", "Prazo: 30/11/2026", "15 de nov.")
    const onlyDate = parsePortugueseDate(line);
    const isDateOnlyLine = !!onlyDate && (DATE_ONLY_LABEL_REGEX.test(line) || line.length < 32);
    if (isDateOnlyLine) {
      if (items.length > 0 && !items[items.length - 1].dueDate) {
        items[items.length - 1].dueDate = onlyDate;
      } else {
        // Blackboard calendar often puts the date header BEFORE the activity card
        pendingDueDate = onlyDate;
      }
      continue;
    }

    let dueDate: string | null = onlyDate || pendingDueDate;
    pendingDueDate = null;

    if (!dueDate && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextDate = parsePortugueseDate(nextLine);
      if (nextDate && (DATE_ONLY_LABEL_REGEX.test(nextLine) || nextLine.length < 32)) {
        dueDate = nextDate;
        i++;
      }
    }

    const cleanTitle = line
      .replace(/(?:data de entrega|entrega|prazo|vence em|vencimento)\s*[:\-–]?\s*/gi, '')
      .replace(/\b20\d{2}-\d{2}-\d{2}\b/, '')
      .replace(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, '')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/, '')
      .replace(/\s*[-–—•|]\s*$/, '')
      .replace(/^\s*[-–—•|]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110);

    if (!cleanTitle || cleanTitle.length < 3) continue;

    items.push({
      title: cleanTitle,
      courseName: currentSubject ? currentSubject.name : null,
      courseCode: currentSubject?.code,
      dueDate,
      turnedIn: currentTurnedIn || /entregue|conclu/i.test(line),
    });
  }

  if (items.length === 0 && discoveredSubjects.size === 0) {
    throw new Error(
      'Nenhuma disciplina ou atividade pôde ser identificada no texto colado. Copie a página de Disciplinas ou Calendário/Atividades do seu AVA (Blackboard, Portal do Aluno, Google Classroom, Canvas ou Moodle) com Ctrl+A e Ctrl+C.'
    );
  }

  return buildResultFromPastedItems(items, [...discoveredSubjects.values()]);
}
