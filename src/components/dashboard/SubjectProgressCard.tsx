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
    if (progress >= 80) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25';
    if (progress >= 65) return 'text-sky-300 bg-sky-500/15 border-sky-500/25';
    if (progress >= 50) return 'text-amber-300 bg-amber-500/15 border-amber-500/25';
    return 'text-rose-300 bg-rose-500/15 border-rose-500/25';
  };

  const handleCardClick = () => {
    setSelectedSubject(subject);
    setActiveTab('disciplinas');
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bento-card-interactive group relative rounded-2xl p-5 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-75 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: subject.color || '#38bdf8' }}
      />

      {/* Top row: Code + Real Percentage */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
            {subject.code}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getProgressBadgeColor(subject.progress)}`}>
            {subject.progress}%
          </span>
        </div>

        {/* Subject Title */}
        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors tracking-tight font-sans line-clamp-1">
          {subject.name}
        </h3>

        {/* Professors */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
          <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-medium text-slate-300/90 truncate">
            {Array.isArray(subject.professors) && subject.professors.length > 0
              ? subject.professors.join(' • ')
              : (subject as any).professor || 'Prof. Responsável'}
          </span>
        </div>
      </div>

      {/* Middle: Progress bar with real percentage */}
      <div className="mt-5">
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(subject.progress)} transition-all duration-700`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>{subject.completedHours}h / {subject.totalHours}h letivas</span>
          <span className="text-amber-400/90 font-mono font-medium">{subject.studyTimeHours}h foco</span>
        </div>
      </div>

      {/* Bottom Footer: Next Class & Detail trigger */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] min-w-0">
          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate">{subject.nextClass}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2">
          Ementa
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </div>
  );
};
