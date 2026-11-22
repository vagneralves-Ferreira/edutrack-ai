import {
  buildExtensionTaskWritePlan,
  planExtensionSubjectSync,
  type ExistingSubjectRow,
  type ParsedPortalSubject,
  type ParsedPortalTask,
} from '../../src/services/academicParser';
import { normalizeText, type ExistingTaskRow } from '../../src/services/classroomImport';
import { extensionSupabase } from './supabaseClient';

export interface ExtensionSyncSummary {
  subjectsCreated: number;
  subjectsExisting: number;
  tasksCreated: number;
  tasksUpdated: number;
}

function toLocalDateIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Grava as disciplinas e prazos selecionados na conta do estudante com 100% de compatibilidade
 * com o schema real do EduTrack AI (`profiles`, `subjects`, `tasks`) e deduplicação idempotente.
 */
export async function syncSelectionToEduTrack(
  selectedSubjects: ParsedPortalSubject[],
  selectedTasks: ParsedPortalTask[]
): Promise<ExtensionSyncSummary> {
  if (!extensionSupabase) {
    throw new Error('Não foi possível conectar ao servidor do EduTrack AI.');
  }

  const { data: userData, error: userError } = await extensionSupabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user?.id) {
    throw new Error('Sua sessão expirou. Entre novamente na sua conta para sincronizar.');
  }

  const uid = user.id;
  const meta = (user.user_metadata || {}) as { name?: string; course?: string; semester?: string };
  const displayName = meta.name?.trim() || user.email?.split('@')[0] || 'Estudante';

  // 1. Garante que existe registro em public.profiles (FK obrigatória de subjects e tasks)
  const { error: profileError } = await extensionSupabase.from('profiles').upsert(
    {
      id: uid,
      nome: displayName,
      curso: meta.course || 'Graduação',
      semestre_atual: meta.semester || '2026.2',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (profileError) {
    throw new Error('Não foi possível preparar seu perfil antes da sincronização. Tente novamente.');
  }

  // 2. Busca disciplinas atuais do usuário para deduplicação inteligente
  const { data: existingSubjectsData, error: subsError } = await extensionSupabase
    .from('subjects')
    .select('id, nome, codigo')
    .eq('user_id', uid);

  if (subsError) {
    throw new Error('Não foi possível verificar suas disciplinas atuais. Verifique sua conexão e tente novamente.');
  }

  const existingSubjects = (existingSubjectsData || []) as ExistingSubjectRow[];
  const plan = planExtensionSubjectSync(uid, selectedSubjects, selectedTasks, existingSubjects);

  // Mapa final de nome normalizado -> UUID real da disciplina no banco
  const subjectUuidByNormName = new Map<string, string>();
  for (const sub of existingSubjects) {
    const norm = normalizeText(sub.nome);
    if (norm) subjectUuidByNormName.set(norm, sub.id);
  }
  for (const matched of plan.matchedSubjects) {
    const norm = normalizeText(matched.nome);
    if (norm) subjectUuidByNormName.set(norm, matched.existingId);
  }

  // 3. Insere apenas as disciplinas realmente novas
  let subjectsCreated = 0;
  for (const toInsert of plan.subjectsToCreate) {
    const { data: inserted, error: insertError } = await extensionSupabase
      .from('subjects')
      .insert({
        user_id: toInsert.user_id,
        codigo: toInsert.codigo,
        nome: toInsert.nome,
        professor: toInsert.professor,
        carga_horaria_total: toInsert.carga_horaria_total,
      })
      .select('id, nome, codigo')
      .single();

    if (insertError || !inserted) {
      throw new Error(`Não foi possível salvar a disciplina "${toInsert.nome}". Tente novamente.`);
    }

    subjectsCreated++;
    subjectUuidByNormName.set(normalizeText(inserted.nome), inserted.id);
  }

  // 4. Deduplicação e upsert idempotente de tarefas/prazos
  let tasksCreated = 0;
  let tasksUpdated = 0;

  if (plan.pendingTasks.length > 0) {
    const { data: existingTasksData, error: tasksFetchError } = await extensionSupabase
      .from('tasks')
      .select('id, classroom_id, titulo, subject_id, status, prioridade, importado_classroom, descricao, data_entrega')
      .eq('user_id', uid);

    if (tasksFetchError) {
      throw new Error('Não foi possível consultar suas tarefas atuais. Tente novamente.');
    }

    const fallbackSubjectUuid =
      subjectUuidByNormName.get(normalizeText('Atividades do Portal')) ||
      [...subjectUuidByNormName.values()][0] ||
      null;

    const taskWritePlan = buildExtensionTaskWritePlan(
      uid,
      plan.pendingTasks,
      subjectUuidByNormName,
      fallbackSubjectUuid,
      (existingTasksData || []) as ExistingTaskRow[],
      toLocalDateIso()
    );

    if (taskWritePlan.updates.length > 0) {
      const { error: updateErr } = await extensionSupabase
        .from('tasks')
        .upsert(taskWritePlan.updates, { onConflict: 'id' });
      if (updateErr) {
        throw new Error('Não foi possível atualizar os prazos existentes. Tente novamente.');
      }
      tasksUpdated = taskWritePlan.updates.length;
    }

    if (taskWritePlan.inserts.length > 0) {
      const { error: insertErr } = await extensionSupabase
        .from('tasks')
        .upsert(taskWritePlan.inserts, { onConflict: 'user_id,classroom_id' });
      if (insertErr) {
        throw new Error('Não foi possível salvar os novos prazos. Tente novamente.');
      }
      tasksCreated = taskWritePlan.inserts.length;
    }
  }

  return {
    subjectsCreated,
    subjectsExisting: plan.matchedSubjects.length,
    tasksCreated,
    tasksUpdated,
  };
}
