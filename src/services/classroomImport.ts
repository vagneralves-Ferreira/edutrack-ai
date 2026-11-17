/**
 * Pure helpers for importing Google Classroom work into public.tasks:
 * class → subject matching and the de-duplicated write plan. No Supabase calls here, so it is unit-testable.
 */
import type { Priority, Subject, TaskStatus } from '../types';

export function normalizeText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** cyrb53: small, stable, non-cryptographic hash (used only to build dedupe keys for pasted text). */
export function stableHash(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Dedupe key for work without an official Classroom id: title + class + due date. */
export function pastedTaskKey(title: string, courseName: string, dueDate: string): string {
  return `paste:${stableHash(`${normalizeText(title)}|${normalizeText(courseName)}|${dueDate}`)}`;
}

const compact = (value?: string | null) => normalizeText(value).replace(/ /g, '');

/**
 * Finds the user's registered subject for a Classroom class name.
 * Order: exact name → subject code inside the class name (e.g. "IMP-INN303") → one name contains the other.
 */
export function findMatchingSubject(
  course: { name: string; code?: string },
  subjects: Pick<Subject, 'id' | 'name' | 'code'>[]
): Pick<Subject, 'id' | 'name' | 'code'> | null {
  const courseName = normalizeText(course.name);
  if (!courseName) return null;

  const exact = subjects.find((s) => normalizeText(s.name) === courseName);
  if (exact) return exact;

  const courseCompact = compact(course.name);
  const courseCode = compact(course.code);
  const byCode = subjects.find((s) => {
    const code = compact(s.code);
    return code.length >= 4 && (courseCompact.includes(code) || (courseCode.length >= 4 && courseCode === code));
  });
  if (byCode) return byCode;

  const contained = subjects
    .filter((s) => {
      const name = normalizeText(s.name);
      const shorter = Math.min(name.length, courseName.length);
      return shorter >= 8 && (courseName.includes(name) || name.includes(courseName));
    })
    .sort((a, b) => normalizeText(b.name).length - normalizeText(a.name).length);
  return contained[0] || null;
}

export interface IncomingClassroomTask {
  classroomId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD (local)
  priority: Priority;
  /** Classroom says the work was turned in (TURNED_IN) or returned (RETURNED). */
  turnedIn: boolean;
  subjectUuid: string;
}

export interface ExistingTaskRow {
  id: string;
  classroom_id: string | null;
  titulo: string;
  subject_id: string;
  status: string;
  prioridade: string;
  importado_classroom: boolean;
  descricao?: string | null;
  data_entrega?: string | null;
}

export interface TaskWritePlan {
  /** Rows that already exist (matched by key or adopted): upsert on `id`. */
  updates: Record<string, unknown>[];
  /** New rows: upsert on (user_id, classroom_id) so a concurrent double sync cannot duplicate. */
  inserts: Record<string, unknown>[];
}

const isOfficialKey = (key?: string | null) => !!key && key.startsWith('gc:');

export function toDueTimestamp(dueDate: string): string | null {
  return dueDate ? new Date(`${dueDate}T00:00:00Z`).toISOString() : null;
}

/**
 * Decides, per Classroom activity, whether to update an existing row or insert a new one.
 *
 * Rules agreed with the user:
 * - title, due date and description come from Classroom;
 * - the Kanban status belongs to the user, except "turned in" in Classroom → completed;
 * - the same activity never becomes two cards: match by classroom_id first, then adopt an
 *   older imported row with the same title in the same subject (rows created before classroom_id existed,
 *   or imported by a weaker method such as pasted text).
 */
export function planClassroomTaskWrites(
  userId: string,
  incomingTasks: IncomingClassroomTask[],
  existingRows: ExistingTaskRow[]
): TaskWritePlan {
  const byKey = new Map(existingRows.filter((r) => r.classroom_id).map((r) => [r.classroom_id as string, r]));
  const claimed = new Set<string>();
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];

  // The same key twice in one payload (e.g. a line pasted twice) is one activity.
  const unique = new Map<string, IncomingClassroomTask>();
  for (const task of incomingTasks) if (!unique.has(task.classroomId)) unique.set(task.classroomId, task);

  for (const task of unique.values()) {
    let row = byKey.get(task.classroomId);
    if (row && claimed.has(row.id)) row = undefined;

    if (!row) {
      const title = normalizeText(task.title);
      row = existingRows.find(
        (r) =>
          !claimed.has(r.id) &&
          r.importado_classroom &&
          r.subject_id === task.subjectUuid &&
          normalizeText(r.titulo) === title &&
          // An official activity only adopts rows without an official key of their own.
          (!isOfficialKey(task.classroomId) || !isOfficialKey(r.classroom_id)) &&
          // Don't steal a row that a different incoming key already owns.
          !(r.classroom_id && unique.has(r.classroom_id) && r.classroom_id !== task.classroomId)
      );
    }

    const status: TaskStatus = task.turnedIn ? 'completed' : ((row?.status as TaskStatus) || 'todo');

    if (!row) {
      inserts.push({
        user_id: userId,
        subject_id: task.subjectUuid,
        classroom_id: task.classroomId,
        titulo: task.title,
        descricao: task.description,
        data_entrega: toDueTimestamp(task.dueDate),
        status,
        prioridade: task.priority,
        importado_classroom: true,
      });
      continue;
    }

    claimed.add(row.id);
    // A weaker source (pasted text) never overwrites data that came from the official API.
    const weakerOverOfficial = isOfficialKey(row.classroom_id) && !isOfficialKey(task.classroomId);
    updates.push({
      id: row.id,
      user_id: userId,
      subject_id: weakerOverOfficial ? row.subject_id : task.subjectUuid,
      classroom_id: weakerOverOfficial ? row.classroom_id : task.classroomId,
      titulo: weakerOverOfficial ? row.titulo : task.title,
      descricao: weakerOverOfficial ? row.descricao ?? '' : task.description,
      data_entrega: weakerOverOfficial ? row.data_entrega ?? null : toDueTimestamp(task.dueDate),
      status,
      prioridade: row.prioridade || task.priority,
      importado_classroom: true,
    });
  }

  return { updates, inserts };
}
