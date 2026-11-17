/**
 * Google Classroom classes the student chose to ignore (e.g. deleted the subject they created), so the next
 * sync does not create them again. Stored in public.classroom_ignored_courses (filtered by user_id, RLS).
 * Until that migration is applied, falls back to this browser's localStorage.
 */
import { supabase } from '../lib/supabase';

export interface IgnoredCourse {
  courseKey: string;
  courseName: string;
}

const TABLE = 'classroom_ignored_courses';
const localKey = (userId: string) => `edutrack_ignored_courses_${userId}`;

function readLocal(userId: string): IgnoredCourse[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.courseKey === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, items: IgnoredCourse[]) {
  try {
    if (items.length === 0) localStorage.removeItem(localKey(userId));
    else localStorage.setItem(localKey(userId), JSON.stringify(items));
  } catch {
    // storage unavailable
  }
}

function mergeUnique(a: IgnoredCourse[], b: IgnoredCourse[]): IgnoredCourse[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((c) => (seen.has(c.courseKey) ? false : (seen.add(c.courseKey), true)));
}

export async function loadIgnoredCourses(userId: string): Promise<IgnoredCourse[]> {
  const local = readLocal(userId);
  const { data, error } = await supabase.from(TABLE).select('course_key, course_name').eq('user_id', userId);
  if (error) return local;
  const fromDb = (data || []).map((r: any) => ({ courseKey: String(r.course_key), courseName: String(r.course_name) }));
  return mergeUnique(fromDb, local);
}

/** Returns where it was saved: 'db' (all devices) or 'local' (migration not applied yet: this browser only). */
export async function addIgnoredCourses(userId: string, items: IgnoredCourse[]): Promise<'db' | 'local'> {
  if (items.length === 0) return 'db';
  const { error } = await supabase.from(TABLE).upsert(
    items.map((c) => ({ user_id: userId, course_key: c.courseKey, course_name: c.courseName })),
    { onConflict: 'user_id,course_key' }
  );
  if (!error) return 'db';
  writeLocal(userId, mergeUnique(readLocal(userId), items));
  return 'local';
}

export async function removeIgnoredCourses(userId: string, courseKeys: string[]): Promise<void> {
  if (courseKeys.length === 0) return;
  writeLocal(userId, readLocal(userId).filter((c) => !courseKeys.includes(c.courseKey)));
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).in('course_key', courseKeys);
  if (error && !/classroom_ignored_courses|does not exist|schema cache/i.test(error.message)) {
    throw new Error(`Erro ao voltar a importar a turma: ${error.message}`);
  }
}
