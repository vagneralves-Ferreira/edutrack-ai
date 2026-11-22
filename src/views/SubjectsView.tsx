import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, X, User, Clock, CheckCircle2, BookMarked, FileText, GraduationCap, Calendar, ExternalLink, Paperclip, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { useAuth } from '../context/AuthContext';
import { AiDica } from '../components/AiDica';
import { EmptyPlannerState } from '../components/EmptyPlannerState';
import { formatDateBR } from '../utils/helpers';
import type { MaterialAttachment, StudyMaterial } from '../types';

const ATTACHMENT_TYPE_LABELS: Record<MaterialAttachment['type'], string> = {
  drive: 'Google Drive',
  youtube: 'YouTube',
  form: 'Formulário',
  link: 'Link',
  classroom: 'Classroom',
};

const ATTACHMENT_OPEN_LABELS: Record<MaterialAttachment['type'], string> = {
  drive: 'Abrir no Drive',
  youtube: 'Assistir',
  form: 'Abrir Formulário',
  link: 'Abrir Link',
  classroom: 'Abrir no Classroom',
};

function resolveAttachmentUrl(att: MaterialAttachment): string {
  const candidate = att.url || att.alternateLink || '';
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (att.driveFileId) return `https://drive.google.com/file/d/${att.driveFileId}/view`;
  return candidate;
}

export const SubjectsView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    subjects,
    tasks,
    selectedSubject,
    setSelectedSubject,
    addSubject,
    updateSubject,
    deleteSubject,
    setIsClassroomModalOpen,
    updateTaskStatus,
    loadError,
  } = usePlanner();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editProf, setEditProf] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTopics, setEditTopics] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('');

  const activeSubject = selectedSubject || subjects[0];
  const subjectTasks = activeSubject
    ? tasks.filter((t) => t.subjectId === activeSubject.id || t.subjectName.toLowerCase() === activeSubject.name.toLowerCase())
    : [];

  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSubject || !newName.trim() || !newCode.trim()) return;
    setIsSubmittingSubject(true);

    addSubject({
      code: newCode.trim(),
      name: newName.trim(),
      professor: newProf.trim() || 'Prof. Responsável',
    });

    setNewCode('');
    setNewName('');
    setNewProf('');
    setIsSubmittingSubject(false);
    setIsModalOpen(false);
  };

  const isDefaultSchedule = (value?: string) => !value || /^(a definir|hor[aá]rio a definir)/i.test(value.trim());

  const openEdit = () => {
    if (!activeSubject) return;
    setEditCode(activeSubject.code);
    setEditName(activeSubject.name);
    setEditProf(
      (activeSubject.professors || []).filter((p) => p !== 'Prof. Responsável').join(', ')
    );
    setEditSchedule(isDefaultSchedule(activeSubject.nextClass) ? '' : activeSubject.nextClass);
    setEditDescription(activeSubject.description || '');
    setEditTopics((activeSubject.topics || []).join('\n'));
    setDialogError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || isBusy) return;
    setIsBusy(true);
    setDialogError(null);
    try {
      const { warning } = await updateSubject(activeSubject.id, {
        code: editCode,
        name: editName,
        professor: editProf,
        schedule: editSchedule,
        description: editDescription,
        topics: editTopics.split('\n'),
      });
      setIsEditOpen(false);
      setNotice(warning ? { kind: 'warning', text: warning } : { kind: 'success', text: `Disciplina "${editName.trim()}" atualizada.` });
    } catch (err: any) {
      setDialogError(err?.message || 'Não foi possível salvar a disciplina.');
    } finally {
      setIsBusy(false);
    }
  };

  const activeFromClassroom = subjectTasks.some((t) => t.importedFromClassroom || t.classroomId);

  const openDelete = () => {
    setDialogError(null);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!activeSubject || isBusy) return;
    const name = activeSubject.name;
    setIsBusy(true);
    setDialogError(null);
    try {
      const summary = await deleteSubject(activeSubject.id);
      setIsConfirmDeleteOpen(false);
      let text = `Disciplina "${name}" excluída com ${summary.deletedTasks} tarefa(s).`;
      if (summary.ignoredInClassroom) {
        text +=
          summary.ignoredStorage === 'local'
            ? ' A turma do Classroom será ignorada nas próximas sincronizações neste navegador (rode a migration 20261117000000 para valer em todos os dispositivos).'
            : ' A turma do Classroom será ignorada nas próximas sincronizações (dá para voltar a importar na Central do Classroom).';
      }
      setNotice({ kind: 'success', text });
    } catch (err: any) {
      setDialogError(err?.message || 'Não foi possível excluir a disciplina.');
    } finally {
      setIsBusy(false);
    }
  };

  const getProfessorLabel = (sub: any) => {
    if (Array.isArray(sub.professors) && sub.professors.length > 0) {
      return sub.professors.join(', ');
    }
    return sub.professor || 'Prof. Responsável';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Disciplinas & Ementas Acadêmicas</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Conteúdo programático, tópicos ministrados e materiais de estudo
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsClassroomModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer shrink-0"
          >
            <BookMarked className="w-4 h-4 text-emerald-400" />
            <span>Importar Grade</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Disciplina</span>
          </button>
        </div>
      </div>

      <AiDica
        tela="Disciplinas"
        contexto={{
          totalDisciplinas: subjects.length,
          disciplinaSelecionada: activeSubject?.name,
        }}
      />

      {notice && (
        <div
          role="status"
          data-testid="subjects-notice"
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
            notice.kind === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)} className="shrink-0 cursor-pointer opacity-80 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {loadError}
        </div>
      )}

      {subjects.length === 0 ? (
        <EmptyPlannerState
          title="Nenhuma disciplina cadastrada"
          description="Envie o PDF do comprovante de matrícula ou um print do portal da sua faculdade (Blackboard, Canvas, Moodle, etc.) para montar sua grade automaticamente."
          onAddSubject={() => setIsModalOpen(true)}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grade Semestral ({subjects.length})</span>
          </div>

          {subjects.map((sub) => {
            const isSelected = activeSubject?.id === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bento-card border-sky-500/40 ring-1 ring-sky-500/25'
                    : 'bento-card-interactive'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-sky-400">{sub.code}</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{sub.progress}%</span>
                </div>
                <h3 className="text-sm font-bold text-white">{sub.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{getProfessorLabel(sub)}</p>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${sub.progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {activeSubject && (
          <div className="lg:col-span-8 space-y-5">
            <div className="p-6 sm:p-7 bento-card rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">{activeSubject.code}</span>
                  <span className="text-xs text-slate-400">{currentUser?.institution || 'Planner Acadêmico'}</span>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                    activeSubject.progress >= 100
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : activeSubject.progress > 0
                      ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                  }`}
                >
                  {activeSubject.progress}% Concluído
                </span>
              </div>

              <div className="flex justify-end gap-2 -mt-1 mb-2">
                <button
                  type="button"
                  onClick={openEdit}
                  title="Editar disciplina"
                  aria-label="Editar disciplina"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-[11px] font-semibold cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={openDelete}
                  title="Excluir disciplina"
                  aria-label="Excluir disciplina"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{activeSubject.name}</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  {getProfessorLabel(activeSubject)}
                </span>
                {activeSubject.nextClass && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {activeSubject.nextClass}
                  </span>
                )}
              </div>

              {activeSubject.description && (
                <p className="text-xs sm:text-sm text-slate-300/90 mt-4 pt-4 border-t border-white/[0.06] leading-relaxed">
                  {activeSubject.description}
                </p>
              )}

              {Array.isArray(activeSubject.topics) && activeSubject.topics.length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Tópicos da Ementa
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSubject.topics.map((topic: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05] text-xs text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Atividades do Google Classroom vinculadas a esta disciplina */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <BookMarked className="w-3.5 h-3.5" />
                    <span>Atividades do Google Classroom ({subjectTasks.length})</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Sincronizado com Kanban</span>
                </div>

                {subjectTasks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400">
                    Nenhuma atividade pendente ou atribuída no Google Classroom para esta disciplina no momento.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {subjectTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const statusLabel =
                        task.status === 'completed'
                          ? 'Concluída'
                          : task.status === 'in_progress'
                          ? 'Em Andamento'
                          : 'A Fazer';
                      const statusColor =
                        task.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : task.status === 'in_progress'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

                      const matchedMaterial = task.classroomId
                        ? (activeSubject.materials || []).find((m) => m.classroomId === task.classroomId)
                        : undefined;
                      const taskAttachments =
                        task.attachments && task.attachments.length > 0
                          ? task.attachments
                          : matchedMaterial?.attachments || [];

                      return (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusColor}`}>
                                {statusLabel}
                              </span>
                              {task.importedFromClassroom && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                                  <BookMarked className="w-2.5 h-2.5" />
                                  Classroom
                                </span>
                              )}
                            </div>
                            <h5 className={`text-xs sm:text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                              {task.title}
                            </h5>
                            <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                            {taskAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {taskAttachments.map((att, idx) => {
                                  const href = resolveAttachmentUrl(att);
                                  if (!href) return null;
                                  return (
                                    <a
                                      key={`${href}-${idx}`}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-[11px] text-cyan-200 hover:text-white transition-colors max-w-full"
                                    >
                                      <Paperclip className="w-3 h-3 text-cyan-400 shrink-0" />
                                      <span className="text-[10px] font-bold uppercase text-cyan-400 shrink-0">
                                        {ATTACHMENT_TYPE_LABELS[att.type]}
                                      </span>
                                      <span className="truncate max-w-[200px]">{att.title}</span>
                                      <ExternalLink className="w-3 h-3 opacity-75 shrink-0" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-cyan-300">
                              <Calendar className="w-3 h-3" />
                              {formatDateBR(task.dueDate)}
                            </span>
                            <button
                              onClick={() => updateTaskStatus(task.id, isDone ? 'todo' : 'completed')}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
                            >
                              {isDone ? 'Reabrir' : 'Marcar Concluída'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Avaliações e Materiais da Disciplina */}
              {/* Only real data (Classroom); empty state otherwise */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]" data-testid="subject-evaluations">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Avaliações & Entregas Registradas</span>
                  </h4>
                  {(activeSubject.evaluations || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400">
                      Nenhuma avaliação registrada. As atividades avaliadas aparecem aqui depois de sincronizar com o Google Classroom.
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSubject.evaluations.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06] flex flex-col gap-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{ev.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Data: {ev.date} • Peso: {ev.weight}%
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              ev.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {ev.status === 'completed' ? (ev.grade ? `Nota ${ev.grade}` : 'Entregue') : 'Pendente'}
                          </span>
                        </div>
                        {ev.attachments && ev.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.05]">
                            {ev.attachments.map((att, idx) => {
                              const href = resolveAttachmentUrl(att);
                              if (!href) return null;
                              return (
                                <a
                                  key={`${href}-${idx}`}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-[10px] text-cyan-200 hover:text-white transition-colors max-w-full"
                                >
                                  <Paperclip className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{att.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-75 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
              </div>

              <div className="mt-6 pt-5 border-t border-white/[0.06]" data-testid="subject-materials">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-3">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Materiais de Aula & Mural Classroom ({(activeSubject.materials || []).length})</span>
                  </h4>
                  {(activeSubject.materials || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400">
                      Nenhum material ou aviso do mural. Eles aparecem aqui depois de sincronizar com o Google Classroom.
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(activeSubject.materials || []).map((mat) => (
                      <button
                        type="button"
                        key={mat.id}
                        onClick={() => setSelectedMaterial(mat)}
                        className="text-left p-3.5 rounded-xl bg-white/[0.025] hover:bg-cyan-500/[0.07] border border-white/[0.06] hover:border-cyan-400/35 space-y-1.5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                            {mat.badge || mat.format}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-cyan-300 font-mono">
                            {mat.attachments && mat.attachments.length > 0 ? (
                              <>
                                <Paperclip className="w-3 h-3" />
                                <span>{mat.attachments.length} anexo{mat.attachments.length > 1 ? 's' : ''}</span>
                              </>
                            ) : (
                              <span>{mat.format}</span>
                            )}
                            <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">{mat.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{mat.description}</p>
                      </button>
                    ))}
                  </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bento-card rounded-2xl w-full max-w-md p-7 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-5">Cadastrar Nova Disciplina</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Código / Sigla</label>
                <input
                  type="text"
                  placeholder="Ex: IMP-ENG301"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome da Disciplina</label>
                <input
                  type="text"
                  placeholder="Ex: Engenharia de Software II"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Professor Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Fábio Nogueira"
                  value={newProf}
                  onChange={(e) => setNewProf(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Portals: the page wrapper's animation creates a stacking context that would put dialogs under the sticky header */}
      {isEditOpen && activeSubject && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-subject-title" className="bento-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7 shadow-2xl relative">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setIsEditOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 id="edit-subject-title" className="text-lg font-bold text-white mb-5">Editar disciplina</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-subject-code" className="block text-xs font-semibold text-slate-300 mb-1.5">Código / Sigla</label>
                <input
                  id="edit-subject-code"
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="edit-subject-name" className="block text-xs font-semibold text-slate-300 mb-1.5">Nome da Disciplina</label>
                <input
                  id="edit-subject-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="edit-subject-prof" className="block text-xs font-semibold text-slate-300 mb-1.5">Professor(es)</label>
                <input
                  id="edit-subject-prof"
                  type="text"
                  placeholder="Ex: Prof. Ana Lima, Prof. João Silva"
                  value={editProf}
                  onChange={(e) => setEditProf(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">Separe mais de um professor com vírgula.</p>
              </div>
              <div>
                <label htmlFor="edit-subject-schedule" className="block text-xs font-semibold text-slate-300 mb-1.5">Horário</label>
                <input
                  id="edit-subject-schedule"
                  type="text"
                  placeholder="Ex: Seg e Qua • 19:15 - 22:00"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="edit-subject-description" className="block text-xs font-semibold text-slate-300 mb-1.5">Descrição</label>
                <textarea
                  id="edit-subject-description"
                  rows={3}
                  placeholder="Ex: Modelagem de dados, normalização e SQL."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-y"
                />
              </div>
              <div>
                <label htmlFor="edit-subject-topics" className="block text-xs font-semibold text-slate-300 mb-1.5">Tópicos da ementa</label>
                <textarea
                  id="edit-subject-topics"
                  rows={4}
                  placeholder={'Um tópico por linha\nEx: Modelo Entidade-Relacionamento'}
                  value={editTopics}
                  onChange={(e) => setEditTopics(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-y"
                />
                <p className="text-[11px] text-slate-500 mt-1">Um tópico por linha. Deixe vazio para não mostrar.</p>
              </div>
              {dialogError && (
                <p role="alert" className="text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3">{dialogError}</p>
              )}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {isBusy ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isConfirmDeleteOpen && activeSubject && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-subject-title" className="bento-card rounded-2xl w-full max-w-md p-7 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 id="delete-subject-title" className="text-base font-bold text-white">
                  Excluir '{activeSubject.name}' e {subjectTasks.length === 1 ? 'sua 1 tarefa' : `suas ${subjectTasks.length} tarefas`}? Essa ação não pode ser desfeita.
                </h3>
                <p className="text-xs text-slate-400">
                  As tarefas desta disciplina serão removidas da sua conta. As outras disciplinas não são afetadas.
                </p>
                {activeFromClassroom && (
                  <p className="text-xs text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Ela veio do Google Classroom: a turma será ignorada nas próximas sincronizações, para não ser recriada.
                      Dá para voltar a importar na Central do Classroom.
                    </span>
                  </p>
                )}
              </div>
            </div>
            {dialogError && (
              <p role="alert" className="mt-4 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3">{dialogError}</p>
            )}
            <div className="flex justify-end gap-3 pt-5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {isBusy ? 'Excluindo...' : 'Excluir disciplina'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedMaterial && createPortal(
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in"
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedMaterial.title}
            className="bento-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/[0.1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-white/[0.07] flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {selectedMaterial.badge || selectedMaterial.format}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{selectedMaterial.format}</span>
                  {activeSubject && (
                    <span className="text-[11px] text-slate-500">• {activeSubject.name}</span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                  {selectedMaterial.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setSelectedMaterial(null)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedMaterial.description}
                </p>
              </div>

              {selectedMaterial.attachments && selectedMaterial.attachments.length > 0 ? (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Arquivos & Links para Estudo ({selectedMaterial.attachments.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedMaterial.attachments.map((att, idx) => {
                      const href = resolveAttachmentUrl(att);
                      if (!href) return null;
                      return (
                        <a
                          key={`${href}-${idx}`}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-xs text-white transition-all group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                {ATTACHMENT_TYPE_LABELS[att.type]}
                              </span>
                              <p className="font-bold text-cyan-100 group-hover:text-white truncate">{att.title}</p>
                            </div>
                            <p className="text-[11px] text-cyan-300/75 truncate font-mono mt-0.5">{href}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[11px] shrink-0">
                            <span>{ATTACHMENT_OPEN_LABELS[att.type]}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : selectedMaterial.url ? (
                <a
                  href={selectedMaterial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Abrir Material para Estudo</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>Este item não possui link direto anexado ainda. Você pode reimportar o JSON do Classroom ou abrir o Classroom da turma.</span>
                  <a
                    href="https://classroom.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-bold text-[11px] shrink-0 inline-flex items-center gap-1"
                  >
                    <span>Classroom</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
