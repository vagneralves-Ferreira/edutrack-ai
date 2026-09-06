import React from 'react';
import type { Subject } from '../../types';
import { User, Clock, ArrowUpRight } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface SubjectProgressCardProps {
  subject: Subject;
}

export const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({ subject }) => {
  const { setSelectedSubject, setActiveTab } = usePlanner();

  // Color mapping for progress bar gradient and accents
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'from-emerald-500 to-teal-400';
    if (progress >= 65) return 'from-sky-500 to-blue-500';
    if (progress >= 50) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-amber-500';
  };

  const getProgressBadgeColor = (progress: number) => {
    if (progress >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (progress >= 65) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (progress >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const handleCardClick = () => {
    setSelectedSubject(subject);
    setActiveTab('disciplinas');
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group relative rounded-2xl bg-[#0f1422] hover:bg-[#131a2b] border border-[#1e273d] hover:border-[#2f3d61] p-5 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-sky-500/5 cursor-pointer flex flex-col justify-between"
    >
      {/* Top row: Code + Real Percentage */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[#161f33] text-slate-400 border border-[#23304d]">
            {subject.code}
          </span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getProgressBadgeColor(subject.progress)}`}>
            {subject.progress}% Concluído
          </span>
        </div>

        {/* Subject Title */}
        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors tracking-tight font-sans">
          {subject.name}
        </h3>

        {/* Professors */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-medium text-slate-300 truncate">
            {subject.professors.join(' • ')}
          </span>
        </div>
      </div>

      {/* Middle: Progress bar with real percentage */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 text-[11px]">Progresso do Semestre</span>
          <span className="font-mono font-semibold text-slate-200 text-xs">{subject.progress}%</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-[#172033] overflow-hidden p-[1px] border border-[#202c44]">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(subject.progress)} transition-all duration-700`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>{subject.completedHours}h de {subject.totalHours}h totais</span>
          <span className="text-amber-400/90 font-medium">{subject.studyTimeHours}h estudo ind.</span>
        </div>
      </div>

      {/* Bottom Footer: Next Class & Detail trigger */}
      <div className="mt-4 pt-3.5 border-t border-[#1c2438] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="truncate max-w-[150px]">{subject.nextClass}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 group-hover:text-amber-300 transition-colors">
          Detalhes
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </div>
  );
};
