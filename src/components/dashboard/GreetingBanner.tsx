import React from 'react';
import { ArrowRight, Sparkles, GraduationCap, Flame, FileDown } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { getGreeting } from '../../utils/helpers';
import { openAcademicReportPdf } from '../../utils/reportGenerator';

export const GreetingBanner: React.FC = () => {
  const { setActiveTab, studentName, subjects, tasks, setIsClassroomModalOpen } = usePlanner();
  const { currentUser } = useAuth();
  const { greeting } = getGreeting(studentName);

  const avgProgress = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length)
    : 0;

  const pendingClassroom = tasks.filter((t) => t.status !== 'completed');

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (avgProgress / 100) * circumference;

  return (
    <div className="bento-card relative overflow-hidden rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between border-violet-500/25">
      {/* Electric Violet & Cyan Mesh Glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-2.5 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-bold tracking-wide uppercase">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{(currentUser?.institution || 'Minha Faculdade').toUpperCase()} • {currentUser?.semester || '2026.2'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {greeting}{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300 mt-0.5">
              Cockpit Acadêmico
            </span>
          </h1>

          <p className="text-xs text-slate-300/85 leading-relaxed">
            Acompanhe suas {subjects.length} disciplinas em tempo real, priorize entregas críticas e estude com foco guiado por IA.
          </p>
        </div>

        {/* Circular SVG Gauge for Overall Semester Progress */}
        <div className="hidden sm:flex flex-col items-center justify-center shrink-0 bg-black/30 border border-white/[0.08] rounded-2xl p-3">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="7"
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                stroke="url(#heroGaugeGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="heroGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-white font-mono">{avgProgress}%</span>
              <span className="text-[8px] uppercase tracking-wider text-cyan-300 font-bold">Semestre</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar inside Hero Card */}
      <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div
          onClick={() => setIsClassroomModalOpen(true)}
          className="flex items-center gap-2 text-[11px] text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl px-3 py-1.5 cursor-pointer transition-colors"
          title="Ver sincronização Google Classroom"
        >
          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>
            Classroom ({pendingClassroom.length} pendentes):{' '}
            <strong className="text-white">Procedure (07/11)</strong> • Tarefas (19/11) •{' '}
            <strong className="text-white">Entrega MVP (23/11)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tarefas')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <span>Abrir Kanban</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-cyan-300 font-semibold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copilot</span>
          </button>
          <button
            onClick={() =>
              openAcademicReportPdf({
                studentName,
                institution: currentUser?.institution || 'Minha Faculdade',
                course: currentUser?.course,
                semester: currentUser?.semester,
                subjects,
                tasks,
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-all cursor-pointer"
            title="Gerar Relatório Acadêmico em PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Relatório PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
