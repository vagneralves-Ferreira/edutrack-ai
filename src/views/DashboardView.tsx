import React from 'react';
import { usePlanner } from '../context/PlannerContext';
import { GreetingBanner } from '../components/dashboard/GreetingBanner';
import { QuickStats } from '../components/dashboard/QuickStats';
import { SubjectProgressCard } from '../components/dashboard/SubjectProgressCard';
import { TimeDistributionChart } from '../components/dashboard/TimeDistributionChart';
import { UpcomingTasksSection } from '../components/dashboard/UpcomingTasksSection';
import { AiDica } from '../components/AiDica';
import { BookOpen, ArrowRight } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { subjects, tasks, setActiveTab } = usePlanner();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Row 1: Bento Hero Banner (7 cols) + AI Dica Copilot Card (5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <GreetingBanner />
        </div>
        <div className="lg:col-span-5">
          <AiDica tela="Visão Geral" />
        </div>
      </section>

      {/* Row 2: 4 Bento Metric Cards */}
      <QuickStats subjects={subjects} tasks={tasks} />

      {/* Row 3: Main Bento Workspace — Upcoming Tasks (7 cols) + Time Distribution Chart (5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <UpcomingTasksSection />
        </div>
        <div className="lg:col-span-5">
          <TimeDistributionChart subjects={subjects} />
        </div>
      </section>

      {/* Row 4: Disciplinas Ativas da Faculdade Impacta */}
      <section className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                Disciplinas Ativas • Faculdade Impacta
              </h2>
              <p className="text-xs text-slate-400">
                Progresso das disciplinas do semestre 2026.2
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('disciplinas')}
            className="text-xs font-semibold text-sky-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Ementas e Professores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bento Grid of the subjects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {subjects.map((subject) => (
            <SubjectProgressCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>
    </div>
  );
};
