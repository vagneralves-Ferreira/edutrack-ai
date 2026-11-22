import {
  inferPortalTaskType,
  parsePortugueseDate,
  type ParsedPortalData,
  type ParsedPortalSubject,
  type ParsedPortalTask,
} from '../../src/services/academicParser';
import { normalizeText, pastedTaskKey } from '../../src/services/classroomImport';
import { extensionSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseClient';

const MAX_AI_TEXT_CHARS = 7500;

/**
 * Extração assistida por IA via Edge Function do projeto.
 * Acionada como fallback inteligente quando o parser determinístico não identifica
 * disciplinas/prazos suficientes na estrutura HTML do portal da faculdade.
 */
export async function extractPortalWithAI(
  sanitizedText: string,
  portalName: string
): Promise<ParsedPortalData> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !extensionSupabase) {
    return { subjects: [], tasks: [] };
  }

  const {
    data: { session },
  } = await extensionSupabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  const truncated = sanitizedText.slice(0, MAX_AI_TEXT_CHARS).trim();
  if (truncated.length < 20) {
    return { subjects: [], tasks: [] };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-dicas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      mode: 'extract_portal',
      portalName,
      text: truncated,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (res.status === 401) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  if (!res.ok) {
    return { subjects: [], tasks: [] };
  }

  const payload = await res.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return { subjects: [], tasks: [] };
  }

  const subjectMap = new Map<string, ParsedPortalSubject>();
  const rawSubjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  for (const s of rawSubjects) {
    const name = String(s?.name || s?.nome || '').trim();
    if (name.length < 2 || name.length > 120) continue;
    const key = normalizeText(name);
    if (!key || subjectMap.has(key)) continue;
    subjectMap.set(key, {
      tempId: `sub:${key}`,
      name,
      code: s?.code ? String(s.code).trim().slice(0, 32) : undefined,
      professor: s?.professor ? String(s.professor).trim().slice(0, 80) : undefined,
    });
  }

  const tasks: ParsedPortalTask[] = [];
  const seenTasks = new Set<string>();
  const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : [];

  for (const t of rawTasks) {
    const title = String(t?.title || t?.titulo || '').trim().slice(0, 110);
    if (title.length < 3) continue;

    const courseName = t?.courseName ? String(t.courseName).trim().slice(0, 120) : null;
    if (courseName) {
      const subKey = normalizeText(courseName);
      if (subKey && !subjectMap.has(subKey)) {
        subjectMap.set(subKey, { tempId: `sub:${subKey}`, name: courseName });
      }
    }

    const rawDue = t?.dueDate ? String(t.dueDate).trim() : '';
    const dueDate = rawDue ? parsePortugueseDate(rawDue) : null;
    const dedupeKey = `${normalizeText(title)}|${normalizeText(courseName || '')}|${dueDate || ''}`;
    if (seenTasks.has(dedupeKey)) continue;
    seenTasks.add(dedupeKey);

    const description = t?.description ? String(t.description).trim().slice(0, 240) : undefined;
    const inferred = inferPortalTaskType(title, description || '');
    const tempId = pastedTaskKey(title, courseName || '', dueDate || 'sem-data');

    tasks.push({
      tempId,
      title,
      courseName,
      dueDate,
      turnedIn: false,
      description,
      priority: inferred.priority,
      type: inferred.type,
    });
  }

  return {
    subjects: [...subjectMap.values()],
    tasks,
  };
}
