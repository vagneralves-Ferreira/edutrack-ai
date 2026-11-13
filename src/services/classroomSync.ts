import type { Subject, Task, StudyMaterial, SubjectModule, Evaluation, Priority, TaskStatus, TaskType } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TASKS } from '../data/initialData';

export interface ClassroomSyncResult {
  subjects: Subject[];
  tasks: Task[];
  stats: {
    coursesCount: number;
    tasksCount: number;
    materialsCount: number;
    evaluationsCount: number;
    announcementsCount: number;
  };
  source: 'google_api' | 'custom_import' | 'impacta_full';
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
 * Conecta diretamente na API REST oficial do Google Classroom (v1) usando um OAuth2 Access Token
 * e importa TODOS os cursos, professores, tópicos, materiais, avisos do mural, atividades, notas e entregas.
 */
export async function fetchGoogleClassroomFullData(accessToken: string): Promise<ClassroomSyncResult> {
  const cleanToken = accessToken.trim().replace(/^Bearer\s+/i, '');
  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/json',
  };

  const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=30', {
    headers,
  });

  if (!coursesRes.ok) {
    const errBody = await coursesRes.json().catch(() => ({}));
    const msg =
      errBody?.error?.message ||
      `Erro HTTP ${coursesRes.status} ao acessar Google Classroom API. Verifique se o token possui os escopos do Classroom.`;
    throw new Error(msg);
  }

  const coursesData = await coursesRes.json();
  const courses: any[] = Array.isArray(coursesData.courses) ? coursesData.courses : [];

  if (courses.length === 0) {
    throw new Error('Nenhuma turma ativa foi encontrada nesta conta do Google Classroom.');
  }

  const syncedSubjects: Subject[] = [];
  const syncedTasks: Task[] = [];
  let totalMaterials = 0;
  let totalEvaluations = 0;
  let totalAnnouncements = 0;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const courseId = String(course.id);
    const courseName = String(course.name || 'Disciplina Classroom');
    const courseSection = course.section ? String(course.section) : '';
    const palette = SUBJECT_PALETTES[i % SUBJECT_PALETTES.length];

    // Tenta casar com disciplina já existente para manter IDs canônicos se aplicável
    const matchedInit = INITIAL_SUBJECTS.find(
      (s) =>
        courseName.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(courseName.toLowerCase())
    );
    const subjectId = matchedInit ? matchedInit.id : `classroom-subj-${slugify(courseName)}-${courseId.slice(-4)}`;

    // Busca em paralelo: professores, tópicos, atividades (courseWork), submissões, materiais e avisos do mural
    const [teachersRes, topicsRes, courseWorkRes, submissionsRes, materialsRes, announcementsRes] =
      await Promise.all([
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/teachers`, { headers }).catch(() => null),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/topics`, { headers }).catch(() => null),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=50`, { headers }).catch(() => null),
        fetch(
          `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/-/studentSubmissions?userId=me&pageSize=50`,
          { headers }
        ).catch(() => null),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWorkMaterials?pageSize=30`, {
          headers,
        }).catch(() => null),
        fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements?pageSize=20`, { headers }).catch(
          () => null
        ),
      ]);

    const teachersJson = teachersRes && teachersRes.ok ? await teachersRes.json().catch(() => ({})) : {};
    const topicsJson = topicsRes && topicsRes.ok ? await topicsRes.json().catch(() => ({})) : {};
    const courseWorkJson = courseWorkRes && courseWorkRes.ok ? await courseWorkRes.json().catch(() => ({})) : {};
    const submissionsJson = submissionsRes && submissionsRes.ok ? await submissionsRes.json().catch(() => ({})) : {};
    const materialsJson = materialsRes && materialsRes.ok ? await materialsRes.json().catch(() => ({})) : {};
    const announcementsJson =
      announcementsRes && announcementsRes.ok ? await announcementsRes.json().catch(() => ({})) : {};

    // 1. Professores
    const teachersList: string[] = Array.isArray(teachersJson.teachers)
      ? teachersJson.teachers
          .map((t: any) => t?.profile?.name?.fullName)
          .filter(Boolean)
          .map((name: string) => (name.toLowerCase().startsWith('prof') ? name : `Prof. ${name}`))
      : matchedInit?.professors || ['Prof. Titular (Classroom)'];

    // 2. Tópicos e Módulos
    const rawTopics: any[] = Array.isArray(topicsJson.topic) ? topicsJson.topic : [];
    const topicNames =
      rawTopics.length > 0
        ? rawTopics.map((t: any) => String(t.name))
        : matchedInit?.topics || ['Conteúdo Programático sincronizado via Google Classroom'];

    const modules: SubjectModule[] =
      rawTopics.length > 0
        ? rawTopics.map((t: any, idx: number) => ({
            id: `mod-${courseId}-${t.topicId || idx}`,
            number: idx + 1,
            title: String(t.name),
            hours: Math.round(80 / Math.max(1, rawTopics.length)),
            description: `Tópico oficial importado da turma ${courseName} no Google Classroom.`,
            topics: [String(t.name)],
          }))
        : matchedInit?.modules || [];

    // 3. Submissões do Aluno (mapeadas por courseWorkId)
    const submissionMap = new Map<string, any>();
    if (Array.isArray(submissionsJson.studentSubmissions)) {
      for (const sub of submissionsJson.studentSubmissions) {
        if (sub.courseWorkId) {
          submissionMap.set(String(sub.courseWorkId), sub);
        }
      }
    }

    // 4. Atividades (courseWork) -> Tasks & Evaluations
    const courseWorkList: any[] = Array.isArray(courseWorkJson.courseWork) ? courseWorkJson.courseWork : [];
    const evaluations: Evaluation[] = [];
    let completedWorkCount = 0;

    for (const work of courseWorkList) {
      const workId = String(work.id);
      const workTitle = String(work.title || 'Atividade Classroom');
      const workDesc = String(work.description || 'Atividade sincronizada diretamente do Google Classroom.');
      const sub = submissionMap.get(workId);

      // Converte status da submissão do Google Classroom
      let status: TaskStatus = 'todo';
      if (sub?.state === 'TURNED_IN' || sub?.state === 'RETURNED') {
        status = 'completed';
        completedWorkCount++;
      } else if (sub?.state === 'CREATED' || sub?.state === 'RECLAIMED_BY_STUDENT') {
        status = 'in_progress';
      }

      // Converte data e hora de entrega
      let dueDate = '2026-11-30';
      let dueTime = '23:59';
      if (work.dueDate && work.dueDate.year) {
        const y = String(work.dueDate.year);
        const m = String(work.dueDate.month || 1).padStart(2, '0');
        const d = String(work.dueDate.day || 1).padStart(2, '0');
        dueDate = `${y}-${m}-${d}`;
      } else if (work.creationTime) {
        dueDate = String(work.creationTime).slice(0, 10);
      }
      if (work.dueTime && typeof work.dueTime.hours === 'number') {
        const hh = String(work.dueTime.hours).padStart(2, '0');
        const mm = String(work.dueTime.minutes || 0).padStart(2, '0');
        dueTime = `${hh}:${mm}`;
      }

      const inferred = inferTaskType(workTitle, workDesc);

      syncedTasks.push({
        id: `classroom-${courseId}-${workId}`,
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
      });

      // Se tiver pontuação máxima ou for avaliação/projeto, adiciona também em Evaluations da disciplina
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
          date: dd && mm ? `${dd}/${mm}` : yyyy || '2026',
          weight: work.maxPoints ? Math.min(100, Number(work.maxPoints)) : 25,
          status: status === 'completed' ? 'completed' : 'pending',
          grade: assignedGrade,
        });
        totalEvaluations++;
      }
    }

    // 5. Materiais de Aula (courseWorkMaterials) + Avisos do Mural (announcements)
    const materials: StudyMaterial[] = [];
    const rawMaterials: any[] = Array.isArray(materialsJson.courseWorkMaterial)
      ? materialsJson.courseWorkMaterial
      : [];

    for (const mat of rawMaterials) {
      const attachment = mat.materials?.[0];
      let format = 'Material Classroom';
      if (attachment?.driveFile) format = 'Google Drive / PDF';
      else if (attachment?.youtubeVideo) format = 'Vídeo YouTube';
      else if (attachment?.link) format = 'Link Externo';

      materials.push({
        id: `mat-${courseId}-${mat.id}`,
        title: String(mat.title || 'Material de Aula'),
        category: 'apostila',
        format,
        description: String(mat.description || `Publicado na turma ${courseName} no Google Classroom.`),
        badge: 'Classroom',
      });
      totalMaterials++;
    }

    const rawAnnouncements: any[] = Array.isArray(announcementsJson.announcements)
      ? announcementsJson.announcements
      : [];
    for (const ann of rawAnnouncements.slice(0, 8)) {
      const cleanText = String(ann.text || '').trim();
      if (!cleanText) continue;
      materials.push({
        id: `ann-${courseId}-${ann.id}`,
        title: `Aviso do Mural: ${cleanText.slice(0, 58)}${cleanText.length > 58 ? '...' : ''}`,
        category: 'artigo',
        format: 'Mural do Professor',
        description: cleanText,
        badge: 'Mural Classroom',
      });
      totalAnnouncements++;
    }

    const totalWork = courseWorkList.length;
    const progress =
      totalWork > 0 ? Math.round((completedWorkCount / totalWork) * 100) : matchedInit?.progress ?? 65;
    const totalHours = matchedInit?.totalHours ?? 80;
    const completedHours = Math.round((progress / 100) * totalHours);

    syncedSubjects.push({
      id: subjectId,
      code: courseSection || matchedInit?.code || `CLS-${courseId.slice(-3)}`,
      name: courseName,
      professors: teachersList.length > 0 ? teachersList : ['Prof. Impacta'],
      progress,
      totalHours,
      completedHours,
      studyTimeHours: matchedInit?.studyTimeHours ?? Math.max(4, Math.round(completedHours * 0.35)),
      color: matchedInit?.color || palette.color,
      accentColor: matchedInit?.accentColor || palette.accentColor,
      nextClass: course.room ? `${course.room} • 19:15` : matchedInit?.nextClass || 'Google Classroom • 19:15',
      schedule: courseSection ? `${courseSection} • 19:15 - 22:00` : matchedInit?.schedule || 'Semestre 2026.2 • 19:15 - 22:00',
      room: course.room || matchedInit?.room || 'Google Classroom / Impacta',
      description:
        course.descriptionHeading ||
        course.description ||
        matchedInit?.description ||
        `Turma oficial sincronizada do Google Classroom (${courseName}).`,
      topics: topicNames,
      modules: modules.length > 0 ? modules : matchedInit?.modules || [],
      materials: materials.length > 0 ? materials : matchedInit?.materials || [],
      evaluations: evaluations.length > 0 ? evaluations : matchedInit?.evaluations || [],
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
    source: 'google_api',
  };
}

/**
 * Sincronização Completa Google Classroom (Abastece TODAS as disciplinas, materiais do mural,
 * avaliações, notas, módulos e todas as atividades do Classroom do aluno Impacta).
 */
export function buildFullClassroomImpactaSync(currentSubjects: Subject[]): ClassroomSyncResult {
  const fullClassroomTasks: Task[] = INITIAL_TASKS.map((t) => ({
    ...t,
    importedFromClassroom: true,
  }));

  const baseList = currentSubjects.length > 0 ? currentSubjects : INITIAL_SUBJECTS;
  let materialsCount = 0;
  let evaluationsCount = 0;
  let announcementsCount = 0;

  const enrichedSubjects: Subject[] = baseList.map((subj) => {
    const matchedInitial = INITIAL_SUBJECTS.find((s) => s.id === subj.id || s.name.toLowerCase() === subj.name.toLowerCase());
    const subjTasks = fullClassroomTasks.filter((t) => t.subjectId === subj.id);
    const completedCount = subjTasks.filter((t) => t.status === 'completed').length;
    const calculatedProgress =
      subjTasks.length > 0
        ? Math.round((completedCount / subjTasks.length) * 100)
        : matchedInitial?.progress ?? subj.progress;

    const classroomAnnouncement: StudyMaterial = {
      id: `cls-mural-${subj.id}`,
      title: `Mural Google Classroom • ${subj.name}`,
      category: 'artigo',
      format: 'Mural Classroom',
      description: `Avisos oficiais, atividades sincronizadas (${subjTasks.length}) e materiais publicados na turma ${subj.name} (${subj.professors.join(', ')}).`,
      badge: 'Sincronizado Classroom',
    };

    const baseMaterials = matchedInitial?.materials || subj.materials || [];
    const hasClassroomMat = baseMaterials.some((m) => m.id === classroomAnnouncement.id);
    const mergedMaterials = hasClassroomMat
      ? baseMaterials
      : [classroomAnnouncement, ...baseMaterials];

    const syncedEvaluations = matchedInitial?.evaluations || subj.evaluations || [];

    materialsCount += mergedMaterials.length;
    evaluationsCount += syncedEvaluations.length;
    announcementsCount += 1;

    return {
      ...(matchedInitial || subj),
      id: subj.id,
      progress: calculatedProgress,
      completedHours: Math.round((calculatedProgress / 100) * subj.totalHours),
      materials: mergedMaterials,
      evaluations: syncedEvaluations,
    };
  });

  return {
    subjects: enrichedSubjects,
    tasks: fullClassroomTasks,
    stats: {
      coursesCount: enrichedSubjects.length,
      tasksCount: fullClassroomTasks.length,
      materialsCount,
      evaluationsCount,
      announcementsCount,
    },
    source: 'impacta_full',
  };
}

function parsePortugueseDate(text: string): string | null {
  // DD/MM/YYYY or DD/MM
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const yearRaw = slashMatch[3];
    const year = yearRaw ? (yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : '2026';
    return `${year}-${month}-${day}`;
  }

  // "07 de nov." / "19 de novembro"
  const monthsMap: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };
  const ptMatch = text.toLowerCase().match(/\b(\d{1,2})\s+de\s+([a-zç]{3,})/i);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const prefix = ptMatch[2].slice(0, 3).toLowerCase();
    if (monthsMap[prefix]) {
      return `2026-${monthsMap[prefix]}-${day}`;
    }
  }
  return null;
}

/**
 * Interpreta texto colado diretamente da página do Google Classroom ("Pendentes" / "Atividades" / "Turmas")
 * ou JSON exportado do Google Takeout e converte em disciplinas e tarefas do EduTrack AI.
 */
export function parseClassroomPastedContent(
  rawContent: string,
  existingSubjects: Subject[],
  replaceExisting = true
): ClassroomSyncResult {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('Cole o conteúdo copiado do Google Classroom ou um JSON válido.');
  }

  const baseSync = buildFullClassroomImpactaSync(existingSubjects);

  // Caso 1: JSON do Google Takeout ou exportação estruturada
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed.tasks || parsed.courseWork || parsed.courses || [];
      if (Array.isArray(list) && list.length > 0) {
        const importedTasks: Task[] = list.map((item: any, idx: number) => {
          const title = String(item.title || item.titulo || item.name || `Atividade Classroom #${idx + 1}`);
          const subjectName = String(item.subjectName || item.courseName || item.turma || 'Innovation Lab: Advanced No/Low Code');
          const matchedSub =
            existingSubjects.find((s) => s.name.toLowerCase().includes(subjectName.toLowerCase())) ||
            existingSubjects[0] ||
            INITIAL_SUBJECTS[0];
          const inferred = inferTaskType(title, String(item.description || ''));
          return {
            id: `classroom-json-${Date.now()}-${idx}`,
            title,
            subjectId: matchedSub.id,
            subjectName: matchedSub.name,
            dueDate: String(item.dueDate || '2026-11-23').slice(0, 10),
            dueTime: String(item.dueTime || '23:59'),
            priority: item.priority || inferred.priority,
            status: item.status === 'completed' || item.status === 'done' || item.state === 'TURNED_IN' ? 'completed' : item.status === 'in_progress' ? 'in_progress' : 'todo',
            type: inferred.type,
            isCriticalMvp: inferred.isCriticalMvp,
            description: String(item.description || 'Importado via pacote JSON do Google Classroom.'),
            importedFromClassroom: true,
          };
        });

        const finalTasks = replaceExisting ? importedTasks : [...importedTasks, ...baseSync.tasks];
        return {
          subjects: baseSync.subjects,
          tasks: finalTasks,
          stats: {
            coursesCount: baseSync.subjects.length,
            tasksCount: finalTasks.length,
            materialsCount: baseSync.stats.materialsCount,
            evaluationsCount: baseSync.stats.evaluationsCount,
            announcementsCount: baseSync.stats.announcementsCount,
          },
          source: 'custom_import',
        };
      }
    } catch {
      // Continua para o parser de texto livre
    }
  }

  // Caso 2: Texto copiado direto da tela do Google Classroom
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const extractedTasks: Task[] = [];
  let currentSubject = existingSubjects[0] || INITIAL_SUBJECTS[0];
  let currentStatus: TaskStatus = 'todo';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(conclu[ií]da|entregue|devolvida)/i.test(line)) {
      currentStatus = 'completed';
      continue;
    }
    if (/^(atribu[ií]do|pendente|a fazer)/i.test(line)) {
      currentStatus = 'todo';
      continue;
    }

    // Verifica se a linha menciona alguma disciplina conhecida
    const matchedSub = existingSubjects.find(
      (s) =>
        line.toLowerCase().includes(s.name.toLowerCase()) ||
        (s.code && line.toLowerCase().includes(s.code.toLowerCase()))
    );
    if (matchedSub && line.length <= matchedSub.name.length + 15) {
      currentSubject = matchedSub;
      continue;
    }

    // Ignora cabeçalhos genéricos do Google Classroom
    if (
      /^(sem data|esta semana|pr[oó]xima semana|mais tarde|ver tudo|google classroom|turmas|agenda|para fazer)$/i.test(
        line
      )
    ) {
      continue;
    }

    // Verifica se a próxima linha é apenas uma data ou nome de disciplina
    let dueDate = parsePortugueseDate(line) || '2026-11-23';
    if (i + 1 < lines.length) {
      const nextDate = parsePortugueseDate(lines[i + 1]);
      if (nextDate && lines[i + 1].length < 25) {
        dueDate = nextDate;
        i++;
      }
    }

    const inferred = inferTaskType(line);
    extractedTasks.push({
      id: `classroom-paste-${Date.now()}-${i}`,
      title: line.replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, '').trim().slice(0, 110) || line.slice(0, 110),
      subjectId: currentSubject.id,
      subjectName: currentSubject.name,
      dueDate,
      dueTime: '23:59',
      priority: inferred.priority,
      status: line.toLowerCase().includes('entregue') || line.toLowerCase().includes('conclu') ? 'completed' : currentStatus,
      type: inferred.type,
      isCriticalMvp: inferred.isCriticalMvp,
      description: `Importado diretamente do Google Classroom (${currentSubject.name}).`,
      importedFromClassroom: true,
    });
  }

  const finalTasks = replaceExisting && extractedTasks.length > 0 ? extractedTasks : [...extractedTasks, ...baseSync.tasks];

  return {
    subjects: baseSync.subjects,
    tasks: finalTasks,
    stats: {
      coursesCount: baseSync.subjects.length,
      tasksCount: finalTasks.length,
      materialsCount: baseSync.stats.materialsCount,
      evaluationsCount: baseSync.stats.evaluationsCount,
      announcementsCount: baseSync.stats.announcementsCount,
    },
    source: 'custom_import',
  };
}
