import type { Subject, Task } from '../types';
import { formatDateBR } from './helpers';

interface ReportPayload {
  studentName: string;
  institution: string;
  course?: string;
  semester?: string;
  subjects: Subject[];
  tasks: Task[];
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openAcademicReportPdf({
  studentName,
  institution,
  course = 'Graduação',
  semester = '2026.2',
  subjects,
  tasks,
}: ReportPayload): void {
  const win = window.open('', '_blank', 'width=960,height=780');
  if (!win) {
    alert('Permita pop-ups no navegador para visualizar e salvar o Relatório PDF.');
    return;
  }

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const avgProgress =
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
      : 0;
  const totalStudyHours = subjects.reduce((acc, s) => acc + (s.studyTimeHours || 0), 0);
  const generatedAt = new Date().toLocaleString('pt-BR');

  const subjectsRows = subjects
    .map(
      (s) => `
      <tr>
        <td><code>${escapeHtml(s.code)}</code></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml((s.professors || []).join(', ') || 'Prof. Responsável')}</td>
        <td>${s.progress}%</td>
        <td>${s.studyTimeHours || 0}h</td>
      </tr>`
    )
    .join('');

  const sortedTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const taskRows = sortedTasks
    .map((t) => {
      const statusLabel =
        t.status === 'completed' ? 'Concluída' : t.status === 'in_progress' ? 'Em Andamento' : 'Pendente';
      const statusClass =
        t.status === 'completed' ? 'badge-ok' : t.status === 'in_progress' ? 'badge-warn' : 'badge-todo';
      return `
      <tr>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td><strong>${escapeHtml(t.title)}</strong></td>
        <td>${escapeHtml(t.subjectName)}</td>
        <td>${escapeHtml(formatDateBR(t.dueDate))}</td>
        <td>${escapeHtml(t.priority.toUpperCase())}</td>
      </tr>`;
    })
    .join('');

  win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Acadêmico - ${escapeHtml(studentName)} (${escapeHtml(institution)})</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #f8fafc; }
    .sheet { max-width: 900px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 8px 30px rgba(15,23,42,.08); }
    .topbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; gap: 16px; }
    .brand { font-size: 22px; font-weight: 800; color: #4f46e5; margin: 0; }
    .sub { font-size: 13px; color: #475569; margin-top: 4px; }
    .btn-print { background: #4f46e5; color: #fff; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 26px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #f8fafc; }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    h2 { font-size: 15px; color: #1e293b; margin: 22px 0 10px; border-left: 4px solid #4f46e5; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; }
    .badge { padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-todo { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 24px; font-size: 11px; color: #64748b; text-align: right; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; padding: 0; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="topbar">
      <div>
        <h1 class="brand">EduTrack AI • Relatório Acadêmico</h1>
        <div class="sub">
          <strong>Aluno:</strong> ${escapeHtml(studentName)} &nbsp;|&nbsp;
          <strong>Instituição:</strong> ${escapeHtml(institution)} &nbsp;|&nbsp;
          <strong>Curso:</strong> ${escapeHtml(course)} (${escapeHtml(semester)})
        </div>
      </div>
      <button class="btn-print" onclick="window.print()">Salvar PDF / Imprimir</button>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Disciplinas</div><div class="kpi-val">${subjects.length}</div></div>
      <div class="kpi"><div class="kpi-label">Avanço Médio</div><div class="kpi-val">${avgProgress}%</div></div>
      <div class="kpi"><div class="kpi-label">Entregas</div><div class="kpi-val">${completedTasks.length}/${tasks.length}</div></div>
      <div class="kpi"><div class="kpi-label">Horas de Foco</div><div class="kpi-val">${totalStudyHours}h</div></div>
    </div>

    <h2>Disciplinas & Corpo Docente</h2>
    <table>
      <thead><tr><th>Código</th><th>Disciplina</th><th>Professor(es)</th><th>Progresso</th><th>Foco</th></tr></thead>
      <tbody>${subjectsRows || '<tr><td colspan="5">Nenhuma disciplina cadastrada.</td></tr>'}</tbody>
    </table>

    <h2>Atividades & Entregas (${pendingTasks.length} pendentes)</h2>
    <table>
      <thead><tr><th>Status</th><th>Atividade</th><th>Disciplina</th><th>Prazo</th><th>Prioridade</th></tr></thead>
      <tbody>${taskRows || '<tr><td colspan="5">Nenhuma tarefa registrada.</td></tr>'}</tbody>
    </table>

    <div class="footer">Gerado pelo EduTrack AI em ${escapeHtml(generatedAt)}</div>
  </div>
  <script>setTimeout(function(){ window.print(); }, 350);</script>
</body>
</html>`);
  win.document.close();
}
