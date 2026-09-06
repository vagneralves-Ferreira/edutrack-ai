import React from 'react';
import { usePlanner } from '../context/PlannerContext';
import { GreetingBanner } from '../components/dashboard/GreetingBanner';
import { QuickStats } from '../components/dashboard/QuickStats';
import { SubjectProgressCard } from '../components/dashboard/SubjectProgressCard';
import { TimeDistributionChart } from '../components/dashboard/TimeDistributionChart';
import { UpcomingTasksSection } from '../components/dashboard/UpcomingTasksSection';
import { BookOpen, ArrowRight } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { subjects, tasks, setActiveTab } = usePlanner();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Greeting Banner with MVP Alert & Countdown */}
      <GreetingBanner />

      {/* 2. Key Academic Semester Stats */}
      <QuickStats subjects={subjects} tasks={tasks} />

      {/* 3. Seção de Disciplinas Ativas da Faculdade Impacta */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight font-sans">
                Disciplinas Ativas • Faculdade Impacta
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Barras de progresso e porcentagens reais do semestre letivo 2026.2
            </p>
          </div>

          <button
            onClick={() => setActiveTab('disciplinas')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Ementas e Professores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid of the 5 subjects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject) => (
            <SubjectProgressCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      {/* 4. Two columns: Time Distribution (Donut Chart) & Upcoming Tasks (MVP Focus) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Tempo por Disciplina (Rosca/Pizza) - 5 cols on lg */}
        <div className="lg:col-span-5">
          <TimeDistributionChart subjects={subjects} />
        </div>

        {/* Seção de Tarefas Próximas & Prazos Críticos - 7 cols on lg */}
        <div className="lg:col-span-7">
          <UpcomingTasksSection />
        </div>
      </section>
    </div>
  );
};
