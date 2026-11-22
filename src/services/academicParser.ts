/**
 * Módulo puro e compartilhado para detecção de portais acadêmicos, sanitização multi-frame,
 * parsing de disciplinas/prazos (Blackboard, Área do Aluno UNICID/Cruzeiro do Sul, Canvas,
 * Moodle, Google Classroom) e planejamento de deduplicação idempotente para o Supabase.
 *
 * Sem dependências de DOM, chrome.* ou cliente Supabase — reutilizado pelo App Web e pela Extensão.
 */
import type { Priority, Subject, TaskType } from '../types';
import {
  normalizeText,
  pastedTaskKey,
  planClassroomTaskWrites,
  type ExistingTaskRow,
  type IncomingClassroomTask,
  type TaskWritePlan,
} from './classroomImport';

export type PortalId =
  | 'blackboard'
  | 'unicid_cruzeiro'
  | 'canvas'
  | 'moodle'
  | 'google_classroom'
  | 'teams'
  | 'generic';

export interface DetectedPortal {
  id: PortalId;
  label: string;
  isSupportedPage: boolean;
  blockedReason?: string;
}

export interface ExtractedFrameInput {
  url?: string;
  title?: string;
  isMainFrame?: boolean;
  lines: string[];
  headings?: string[];
  cardBlocks?: string[];
}

export interface ParsedPortalSubject {
  tempId: string;
  name: string;
  code?: string;
  professor?: string;
}

export interface ParsedPortalTask {
  tempId: string;
  title: string;
  courseName: string | null;
  courseCode?: string;
  dueDate: string | null; // YYYY-MM-DD
  turnedIn: boolean;
  urgent?: boolean;
  description?: string;
  explicitKey?: string;
  priority: Priority;
  type: TaskType;
}

export interface ParsedPortalData {
  subjects: ParsedPortalSubject[];
  tasks: ParsedPortalTask[];
}

export interface ExistingSubjectRow {
  id: string;
  nome: string;
  codigo: string;
}

export interface ExtensionSubjectInsert {
  tempId: string;
  user_id: string;
  codigo: string;
  nome: string;
  professor: string;
  carga_horaria_total: number;
}

export interface ExtensionMatchedSubject {
  tempId: string;
  existingId: string;
  nome: string;
  codigo: string;
}

export interface ExtensionSyncPlan {
  subjectsToCreate: ExtensionSubjectInsert[];
  matchedSubjects: ExtensionMatchedSubject[];
  /** Mapa temporário para resolver tarefas cujas disciplinas já existem no banco. */
  existingSubjectIdByTempId: Record<string, string>;
  /** Lista de tarefas selecionadas prontas para planejar após inserção das novas disciplinas. */
  pendingTasks: ParsedPortalTask[];
}

const PROTECTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'extension://',
  'about:',
  'view-source:',
  'devtools://',
  'moz-extension://',
];

const PROTECTED_HOSTS = [
  'chrome.google.com/webstore',
  'chromewebstore.google.com',
  'microsoftedge.microsoft.com/addons',
];

export function isProtectedBrowserUrl(url?: string | null): boolean {
  const clean = String(url || '').trim().toLowerCase();
  if (!clean) return true;
  if (PROTECTED_URL_PREFIXES.some((prefix) => clean.startsWith(prefix))) return true;
  if (PROTECTED_HOSTS.some((host) => clean.includes(host))) return true;
  return false;
}

export function detectPortalFromContext(url?: string, title?: string, textSample?: string): DetectedPortal {
  const rawUrl = String(url || '').trim();
  if (isProtectedBrowserUrl(rawUrl)) {
    return {
      id: 'generic',
      label: 'Página do navegador',
      isSupportedPage: false,
      blockedReason:
        'Esta página é protegida pelo navegador. Abra o portal da sua faculdade (como Blackboard, Canvas, Moodle ou Google Classroom) e tente novamente.',
    };
  }

  const haystack = `${rawUrl} ${title || ''} ${(textSample || '').slice(0, 1500)}`.toLowerCase();

  if (haystack.includes('classroom.google.com')) {
    return { id: 'google_classroom', label: 'Google Classroom', isSupportedPage: true };
  }
  if (
    haystack.includes('blackboard') ||
    haystack.includes('bbcswebdav') ||
    haystack.includes('/ultra/course') ||
    haystack.includes('/ultra/stream') ||
    haystack.includes('/webapps/portal')
  ) {
    if (haystack.includes('cruzeirodosul') || haystack.includes('unicid')) {
      return { id: 'unicid_cruzeiro', label: 'Blackboard • UNICID / Cruzeiro do Sul', isSupportedPage: true };
    }
    return { id: 'blackboard', label: 'Blackboard', isSupportedPage: true };
  }
  if (
    haystack.includes('cruzeirodosul') ||
    haystack.includes('unicid') ||
    haystack.includes('novoportal.cruzeirodosul') ||
    haystack.includes('areadoaluno')
  ) {
    return { id: 'unicid_cruzeiro', label: 'Portal UNICID / Cruzeiro do Sul', isSupportedPage: true };
  }
  if (haystack.includes('instructure.com') || haystack.includes('canvas lms')) {
    return { id: 'canvas', label: 'Canvas', isSupportedPage: true };
  }
  if (haystack.includes('moodle') || haystack.includes('/my/courses.php') || haystack.includes('/course/view.php')) {
    return { id: 'moodle', label: 'Moodle', isSupportedPage: true };
  }
  if (haystack.includes('teams.microsoft.com')) {
    return { id: 'teams', label: 'Microsoft Teams', isSupportedPage: true };
  }

  return { id: 'generic', label: 'Portal Acadêmico', isSupportedPage: true };
}

export function parsePortugueseDate(text: string): string | null {
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

export function looksLikeSourceCode(rawContent: string): boolean {
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

export function inferPortalTaskType(
  title: string,
  description = ''
): { type: TaskType; isCriticalMvp: boolean; priority: Priority } {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('mvp') || text.includes('entrega final') || text.includes('avaliação') || text.includes('prova') || text.includes('a1') || text.includes('a2')) {
    return { type: 'avaliacao', isCriticalMvp: text.includes('mvp'), priority: 'alta' };
  }
  if (text.includes('projeto') || text.includes('trabalho') || text.includes('prática') || text.includes('pratica') || text.includes('as1') || text.includes('as2')) {
    return { type: 'projeto', isCriticalMvp: false, priority: 'alta' };
  }
  if (text.includes('aula') || text.includes('material') || text.includes('slides') || text.includes('leitura')) {
    return { type: 'leitura', isCriticalMvp: false, priority: 'baixa' };
  }
  return { type: 'exercicio', isCriticalMvp: false, priority: 'media' };
}

export const PORTAL_NOISE_LINE_REGEX =
  /^(pular para o conte[úu]do.*|google\s*(sala de aula|classroom)|blackboard(\s+learn)?|canvas|moodle|[áa]rea do aluno|portal do aluno|p[áa]gina da institui[çc][ãa]o|fluxo de atividades|menu principal|pendentes?|conclu[ií]das?|atribu[ií]d[ao]s?|todas as turmas|turmas|cursos(\s+atuais)?|todos os cursos|meus cursos|minhas disciplinas|disciplinas|organiza[çc][õo]es|calend[áa]rio|mensagens|ferramentas|sair|acessibilidade|privacidade|termos(\s+de\s+uso)?|pol[ií]tica de privacidade|cookies?|pesquisar cursos.*|buscar.*|filtro|filtros|aberto|fechado|privado|m[óo]dulos|avisos|agenda|para fazer|inscrito|configura[çc][õo]es|ajuda|suporte|feedback|sem data.*|sem prazo|hoje|amanh[ãa]|pr[oó]xim[oa]s?|esta semana|pr[oó]xima semana|mais tarde|anteriores|ver tudo|ver detalhes|ver mais|visualizar|carregar mais|nenhuma atividade|nenhum trabalho|nenhum material|mural|atividades|pessoas|notas|criar|postado em.*|editado.*|data de entrega:?|cruzeiro do sul(\s+educacional)?|unicid|v[áa]rios instrutores|in[íi]cio|home|perfil|financeiro|secretaria|biblioteca|protocolo|atendimento|copyright.*|todos os direitos reservados.*|\d{1,2}:\d{2})$/i;

const EXPLICIT_SUBJECT_REGEX = /^(?:disciplina|curso|mat[ée]ria|turma)\s*[:\-–]\s*(.{3,100})$/i;
const CODE_AND_SUBJECT_REGEX =
  /^((?:20\d{2}[._-]?\d?[._-]?)?(?:[A-Z]{2,8}[._-])*[A-Z]{2,8}[._-]?\d{2,6}(?:[._-][A-Z0-9]+)*|\d{5,9}(?:[._-]\d{1,4})?|20\d{2}[./-][12])\s*[-–—•|:]\s*(.{4,100})$/;
const STANDALONE_COURSE_CODE_REGEX =
  /^(?:20\d{2}[._-]\d[._-][A-Z0-9._-]{2,}|[A-Z]{2,6}[_-]\d{2,6}(?:[_-][A-Z0-9]+)*|\d{5,9}[_-][A-Z0-9_-]{2,})$/;
const DATE_ONLY_LABEL_REGEX =
  /^(?:(?:data de entrega|entrega|prazo|vence em|vencimento|due(?:\s+date)?)\s*[:\-–]?\s*)?(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:de\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç.]*(?:\s+(?:de\s+)?20\d{2})?)(?:\s*(?:[àa]s|-|•|,)?\s*\d{1,2}:\d{2}(?::\d{2})?)?$/i;

/**
 * Une e sanitiza linhas coletadas do frame principal e de todos os iframes/Shadow DOM,
 * eliminando duplicatas consecutivas, ruído de navegação e respeitando um teto seguro de caracteres.
 */
export function sanitizeExtractedFrames(frames: ExtractedFrameInput[], maxChars = 14000): string {
  const ordered = [...frames].sort((a, b) => Number(Boolean(b.isMainFrame)) - Number(Boolean(a.isMainFrame)));
  const outputLines: string[] = [];
  const seenBlocks = new Set<string>();
  let totalChars = 0;

  const pushLine = (raw: string) => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (clean.length < 3 || clean.length > 260) return;
    if (/^[A-ZÀ-Ú]$/.test(clean)) return;
    if (PORTAL_NOISE_LINE_REGEX.test(clean) || isCodeSnippetLine(clean)) return;
    if (outputLines.length > 0 && outputLines[outputLines.length - 1] === clean) return;
    if (totalChars + clean.length + 1 > maxChars) return;
    outputLines.push(clean);
    totalChars += clean.length + 1;
  };

  for (const frame of ordered) {
    const candidates: string[] = [];
    if (Array.isArray(frame.cardBlocks) && frame.cardBlocks.length > 0) {
      for (const block of frame.cardBlocks) {
        const normalizedBlock = normalizeText(block);
        if (!normalizedBlock || seenBlocks.has(normalizedBlock)) continue;
        seenBlocks.add(normalizedBlock);
        candidates.push(...block.split(/\r?\n/));
      }
    }
    if (Array.isArray(frame.lines)) {
      candidates.push(...frame.lines);
    }

    for (const line of candidates) {
      pushLine(line);
      if (totalChars >= maxChars) break;
    }
    if (totalChars >= maxChars) break;
  }

  return outputLines.join('\n');
}

function slugifyCode(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
}

export function buildExtensionSubjectCode(name: string, preferredCode?: string): string {
  const cleanPreferred = (preferredCode || '').trim();
  if (cleanPreferred) return cleanPreferred.slice(0, 32);
  const slug = slugifyCode(name) || 'DISC';
  return `AVA-${slug}`;
}

/**
 * Parser determinístico compartilhado entre o app web e a extensão de navegador.
 * Reconhece:
 * - JSON estruturado (incluindo saída de IA ou exportação);
 * - Blackboard Original / Ultra (códigos de disciplina, cards, calendário);
 * - Portal do Aluno (UNICID / Cruzeiro do Sul);
 * - Canvas, Moodle e Google Classroom.
 */
export function parseAcademicPortalText(
  rawContent: string,
  existingSubjects: Pick<Subject, 'id' | 'name' | 'code'>[] = []
): ParsedPortalData {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return { subjects: [], tasks: [] };
  }

  if (looksLikeSourceCode(trimmed)) {
    throw new Error(
      'O conteúdo colado parece ser código de programação, não uma lista de disciplinas ou atividades. Copie a página de disciplinas ou prazos no portal da sua faculdade e cole aqui.'
    );
  }

  // Case 1: JSON estruturado (ex.: resposta da IA ou arquivo importado)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = null;
    }
    if (parsed) {
      const subjectMap = new Map<string, ParsedPortalSubject>();
      const rawSubjects = Array.isArray(parsed?.subjects) ? parsed.subjects : [];
      for (const s of rawSubjects) {
        const name = String(s?.name || s?.nome || '').trim();
        if (name.length < 2) continue;
        const key = normalizeText(name);
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            tempId: `sub:${key}`,
            name,
            code: s?.code || s?.codigo ? String(s.code || s.codigo).trim() : undefined,
            professor: s?.professor ? String(s.professor).trim() : undefined,
          });
        }
      }

      const list = Array.isArray(parsed) ? parsed : parsed.tasks || parsed.courseWork || [];
      const tasks: ParsedPortalTask[] = [];
      if (Array.isArray(list)) {
        list.forEach((item: any, idx: number) => {
          const title = String(item?.title || item?.titulo || item?.name || '').trim();
          if (title.length < 2) return;
          const courseName = item?.courseName || item?.subjectName || item?.turma || item?.disciplina || null;
          const cleanCourseName = courseName ? String(courseName).trim() : null;
          if (cleanCourseName) {
            const key = normalizeText(cleanCourseName);
            if (key && !subjectMap.has(key)) {
              subjectMap.set(key, {
                tempId: `sub:${key}`,
                name: cleanCourseName,
                code: item?.courseCode ? String(item.courseCode).trim() : undefined,
              });
            }
          }
          const rawId = item?.id ?? item?.courseWorkId;
          const dueRaw = item?.dueDate || item?.data_entrega || item?.prazo || null;
          const dueDate = dueRaw ? parsePortugueseDate(String(dueRaw)) || String(dueRaw).slice(0, 10) : null;
          const inferred = inferPortalTaskType(title, item?.description ? String(item.description) : '');
          const explicitKey =
            rawId != null && rawId !== ''
              ? `json:${item.courseId ?? normalizeText(cleanCourseName || '').replace(/ /g, '-')}:${rawId}`
              : undefined;
          tasks.push({
            tempId: explicitKey || `task:${idx}:${normalizeText(title)}`,
            title,
            courseName: cleanCourseName,
            courseCode: item?.courseCode ? String(item.courseCode).trim() : undefined,
            dueDate: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
            turnedIn:
              item?.status === 'completed' ||
              item?.status === 'done' ||
              item?.state === 'TURNED_IN' ||
              item?.state === 'RETURNED' ||
              Boolean(item?.turnedIn),
            description: item?.description ? String(item.description).trim() : undefined,
            explicitKey,
            priority: inferred.priority,
            type: inferred.type,
          });
        });
      }

      if (subjectMap.size > 0 || tasks.length > 0) {
        return { subjects: [...subjectMap.values()], tasks };
      }
    }
  }

  // Case 2: Texto livre extraído do portal (Blackboard, UNICID/Cruzeiro, Canvas, Moodle, Classroom)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[A-ZÀ-Ú]$/.test(l));

  const tasks: ParsedPortalTask[] = [];
  const discoveredSubjects = new Map<string, ParsedPortalSubject>();
  let currentSubject: ParsedPortalSubject | null = null;
  let currentTurnedIn = false;
  let pendingDueDate: string | null = null;

  const registerSubject = (name: string, code?: string, professor?: string): ParsedPortalSubject | null => {
    const cleanName = name.replace(/\s+/g, ' ').trim();
    if (cleanName.length < 3) return null;
    const key = normalizeText(cleanName);
    if (!key) return null;
    const existing = discoveredSubjects.get(key);
    if (existing) {
      if (code && !existing.code) existing.code = code;
      if (professor && !existing.professor) existing.professor = professor;
      return existing;
    }
    const created: ParsedPortalSubject = {
      tempId: `sub:${key}`,
      name: cleanName,
      code,
      professor,
    };
    discoveredSubjects.set(key, created);
    return created;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(conclu[ií]da|entregue|devolvida|enviado|nota\b)/i.test(line)) {
      if (tasks.length > 0 && /entregue|devolvida|enviado/i.test(line)) {
        tasks[tasks.length - 1].turnedIn = true;
      } else {
        currentTurnedIn = true;
      }
      continue;
    }
    if (/^(atribu[ií]d[ao]|pendente|a fazer|em aberto|com atraso|atrasad[oa]|n[ãa]o enviado)/i.test(line)) {
      if (tasks.length > 0 && /com atraso|atrasad[oa]|pendente/i.test(line)) {
        tasks[tasks.length - 1].urgent = true;
        tasks[tasks.length - 1].priority = 'alta';
      } else {
        currentTurnedIn = false;
      }
      continue;
    }

    // Professor line right after a subject header
    const profMatch = line.match(/^(?:prof(?:\.|essor(?:a)?)?|docente|instrutor(?:a)?)\s*[:\-–]\s*(.{3,80})$/i);
    if (profMatch && currentSubject) {
      currentSubject.professor = profMatch[1].trim();
      continue;
    }

    // 1. Explicit subject label ("Disciplina: Anatomia Humana", "Curso: ...")
    const explicitSubject = line.match(EXPLICIT_SUBJECT_REGEX);
    if (explicitSubject) {
      const sub = registerSubject(explicitSubject[1]);
      if (sub) currentSubject = sub;
      continue;
    }

    // 2. Blackboard / Portal line combining course code + subject name ("20262_GRAD_BIO_101 - Anatomia Humana")
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
          !PORTAL_NOISE_LINE_REGEX.test(nextLine) &&
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

    // 4. Short line matching one of the user's already-registered subjects
    const matchedSub = existingSubjects.find(
      (s) =>
        line.toLowerCase().includes(s.name.toLowerCase()) ||
        (s.code && line.toLowerCase().includes(s.code.toLowerCase()))
    );
    if (matchedSub && line.length <= matchedSub.name.length + 20) {
      const registered = registerSubject(matchedSub.name, matchedSub.code);
      if (tasks.length > 0 && i > 0 && !PORTAL_NOISE_LINE_REGEX.test(lines[i - 1])) {
        const last = tasks[tasks.length - 1];
        if (!last.courseName) {
          last.courseName = matchedSub.name;
          last.courseCode = matchedSub.code;
        }
      }
      currentSubject = registered;
      continue;
    }

    if (PORTAL_NOISE_LINE_REGEX.test(line) || isCodeSnippetLine(line)) {
      continue;
    }

    // 5. A date-only line ("Entrega: 25/11/2026 23:59", "Prazo: 30/11/2026", "15 de nov.")
    const onlyDate = parsePortugueseDate(line);
    const isDateOnlyLine = !!onlyDate && (DATE_ONLY_LABEL_REGEX.test(line) || line.length < 32);
    if (isDateOnlyLine) {
      if (tasks.length > 0 && !tasks[tasks.length - 1].dueDate) {
        tasks[tasks.length - 1].dueDate = onlyDate;
      } else {
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
      .replace(/\b\d{1,2}\s+(?:de\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç.]*(?:\s+(?:de\s+)?20\d{2})?\b/i, '')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/, '')
      .replace(/\s*[-–—•|]\s*$/, '')
      .replace(/^\s*[-–—•|]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110);

    if (!cleanTitle || cleanTitle.length < 3) continue;

    const inferred = inferPortalTaskType(cleanTitle);
    const courseName = currentSubject ? currentSubject.name : null;
    const key = pastedTaskKey(cleanTitle, courseName || '', dueDate || 'sem-data');

    tasks.push({
      tempId: key,
      title: cleanTitle,
      courseName,
      courseCode: currentSubject?.code,
      dueDate,
      turnedIn: currentTurnedIn || /entregue|conclu/i.test(line),
      priority: inferred.priority,
      type: inferred.type,
    });
  }

  // Deduplica tarefas idênticas na mesma leitura
  const dedupedTasks: ParsedPortalTask[] = [];
  const seenTaskKeys = new Set<string>();
  for (const t of tasks) {
    const dedupeKey = `${normalizeText(t.title)}|${normalizeText(t.courseName || '')}|${t.dueDate || ''}`;
    if (seenTaskKeys.has(dedupeKey)) continue;
    seenTaskKeys.add(dedupeKey);
    dedupedTasks.push(t);
  }

  return {
    subjects: [...discoveredSubjects.values()],
    tasks: dedupedTasks,
  };
}

/**
 * Planeja a criação idempotente de disciplinas selecionadas na extensão, deduplicando contra
 * as disciplinas já existentes do usuário no Supabase (normalizando acentos, caixa e código).
 */
export function planExtensionSubjectSync(
  userId: string,
  selectedSubjects: ParsedPortalSubject[],
  selectedTasks: ParsedPortalTask[],
  existingSubjects: ExistingSubjectRow[]
): ExtensionSyncPlan {
  const knownByNormalizedName = new Map<string, ExistingSubjectRow>();
  const knownByNormalizedCode = new Map<string, ExistingSubjectRow>();
  const usedCodes = new Set<string>();

  for (const sub of existingSubjects) {
    const normName = normalizeText(sub.nome);
    const normCode = normalizeText(sub.codigo);
    if (normName) knownByNormalizedName.set(normName, sub);
    if (normCode) {
      knownByNormalizedCode.set(normCode, sub);
      usedCodes.add(sub.codigo.trim().toLowerCase());
    }
  }

  // Se houver tarefas sem disciplina selecionada, cria um agrupador neutro apenas se necessário
  const effectiveSubjects: ParsedPortalSubject[] = [...selectedSubjects];
  const hasOrphanTask = selectedTasks.some((t) => {
    if (!t.courseName) return true;
    const key = normalizeText(t.courseName);
    return !effectiveSubjects.some((s) => normalizeText(s.name) === key);
  });

  if (hasOrphanTask) {
    const fallbackName = 'Atividades do Portal';
    const fallbackKey = normalizeText(fallbackName);
    if (!effectiveSubjects.some((s) => normalizeText(s.name) === fallbackKey)) {
      effectiveSubjects.push({
        tempId: `sub:${fallbackKey}`,
        name: fallbackName,
        code: 'AVA-GERAL',
      });
    }
  }

  const subjectsToCreate: ExtensionSubjectInsert[] = [];
  const matchedSubjects: ExtensionMatchedSubject[] = [];
  const existingSubjectIdByTempId: Record<string, string> = {};
  const plannedByName = new Set<string>();

  const makeUniqueCode = (baseCode: string): string => {
    const cleanBase = baseCode.trim() || 'AVA-DISC';
    if (!usedCodes.has(cleanBase.toLowerCase())) {
      usedCodes.add(cleanBase.toLowerCase());
      return cleanBase;
    }
    let idx = 2;
    while (usedCodes.has(`${cleanBase}-${idx}`.toLowerCase())) idx++;
    const candidate = `${cleanBase}-${idx}`;
    usedCodes.add(candidate.toLowerCase());
    return candidate;
  };

  for (const candidate of effectiveSubjects) {
    const normName = normalizeText(candidate.name);
    if (!normName || plannedByName.has(normName)) continue;
    plannedByName.add(normName);

    const normCode = candidate.code ? normalizeText(candidate.code) : '';
    const existing =
      knownByNormalizedName.get(normName) ||
      (normCode && !normCode.startsWith('ava ') ? knownByNormalizedCode.get(normCode) : undefined);

    if (existing) {
      matchedSubjects.push({
        tempId: candidate.tempId,
        existingId: existing.id,
        nome: existing.nome,
        codigo: existing.codigo,
      });
      existingSubjectIdByTempId[candidate.tempId] = existing.id;
      continue;
    }

    const uniqueCode = makeUniqueCode(buildExtensionSubjectCode(candidate.name, candidate.code));
    subjectsToCreate.push({
      tempId: candidate.tempId,
      user_id: userId,
      codigo: uniqueCode,
      nome: candidate.name.trim(),
      professor: candidate.professor?.trim() || 'Prof. Responsável',
      carga_horaria_total: 80,
    });
  }

  return {
    subjectsToCreate,
    matchedSubjects,
    existingSubjectIdByTempId,
    pendingTasks: selectedTasks,
  };
}

/**
 * Converte as tarefas selecionadas para o plano de upsert idempotente do Supabase (`public.tasks`)
 * usando o mesmo algoritmo `planClassroomTaskWrites` do app web.
 */
export function buildExtensionTaskWritePlan(
  userId: string,
  tasks: ParsedPortalTask[],
  subjectUuidByNormalizedName: Map<string, string>,
  fallbackSubjectUuid: string | null,
  existingTasks: ExistingTaskRow[],
  todayIso: string
): TaskWritePlan {
  const incoming: IncomingClassroomTask[] = [];

  for (const task of tasks) {
    const normCourse = task.courseName ? normalizeText(task.courseName) : '';
    const subjectUuid =
      (normCourse ? subjectUuidByNormalizedName.get(normCourse) : undefined) || fallbackSubjectUuid;
    if (!subjectUuid) continue;

    const dueDate = task.dueDate || todayIso;
    const classroomId = task.explicitKey || pastedTaskKey(task.title, task.courseName || '', dueDate);

    incoming.push({
      classroomId,
      title: task.title,
      description:
        task.description ||
        `Importado pela Extensão EduTrack AI${task.courseName ? ` (${task.courseName})` : ''}.`,
      dueDate,
      priority: task.urgent ? 'alta' : task.priority,
      turnedIn: task.turnedIn,
      subjectUuid,
    });
  }

  return planClassroomTaskWrites(userId, incoming, existingTasks);
}
