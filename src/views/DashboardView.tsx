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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* BENTO ROW 1: 3-Column Asymmetric Cockpit Strip (Hero 5 cols + 2x2 Stats 4 cols + AI Copilot 3 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5">
          <GreetingBanner />
        </div>
        <div className="lg:col-span-4">
          <QuickStats subjects={subjects} tasks={tasks} />
        </div>
        <div className="lg:col-span-3">
          <AiDica tela="Visão Geral" />
        </div>
      </section>

      {/* BENTO ROW 2: 5-Column Horizontal Strip of Subjects with Circular Gauges */}
      <section className="bento-card rounded-3xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Grade Curricular Ativa • 2026.2
              </h2>
              <p className="text-[11px] text-slate-400">
                Clique em qualquer disciplina para abrir a ementa e materiais
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('disciplinas')}
            className="text-xs font-bold text-cyan-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Gerenciar Disciplinas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {subjects.map((subject) => (
            <SubjectProgressCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      {/* BENTO ROW 3: Central de Entregas (8 cols) + Distribuição de Foco (4 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <UpcomingTasksSection />
        </div>
        <div className="lg:col-span-4">
          <TimeDistributionChart subjects={subjects} />
        </div>
      </section>
    </div>
  );
};
