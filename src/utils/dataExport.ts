import type { Subject, Task } from '../types';

/** Version of the export format read by scripts/generate_progress_report.py. */
export const EXPORT_FORMAT_VERSION = 1;

interface ExportInput {
  studentName: string;
  institution: string;
  course?: string;
  semester?: string;
  subjects: Subject[];
  tasks: Task[];
}

/**
 * Builds the user's own data export. Uses only data already loaded for the signed-in user
 * (Supabase rows filtered by RLS / user_id). No e-mail, user id, tokens or keys are included.
 */
export function buildUserDataExport({ studentName, institution, course, semester, subjects, tasks }: ExportInput) {
  return {
    format: 'edutrack-user-export',
    version: EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    student: {
      name: studentName,
      institution,
      course: course || null,
      semester: semester || null,
    },
    subjects: subjects.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      professors: s.professors,
      total_hours: s.totalHours,
      study_time_hours: s.studyTimeHours,
    })),
    tasks: tasks.map((t) => ({
      title: t.title,
      subject_id: t.subjectId,
      subject_name: t.subjectName,
      due_date: t.dueDate,
      status: t.status,
      priority: t.priority,
      imported_from_classroom: !!t.importedFromClassroom,
    })),
  };
}

/** Triggers a browser download of the export as JSON. */
export function downloadUserDataExport(input: ExportInput): void {
  const data = buildUserDataExport(input);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `edutrack-dados-${data.exported_at.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
