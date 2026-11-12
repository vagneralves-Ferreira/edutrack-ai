import React from 'react';
import type { Subject } from '../../types';
import { User, ArrowUpRight } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface SubjectProgressCardProps {
  subject: Subject;
}

export const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({ subject }) => {
  const { setSelectedSubject, setActiveTab } = usePlanner();

  const handleCardClick = () => {
    setSelectedSubject(subject);
    setActiveTab('disciplinas');
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (subject.progress / 100) * circumference;
  const accent = subject.color || '#8b5cf6';

  return (
    <div 
      onClick={handleCardClick}
      className="bento-card-interactive group relative rounded-2xl p-4 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Glowing side bar */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: accent }}
      />

      {/* Top row: Code + Circular SVG Ring */}
      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-300 inline-block mb-2">
            {subject.code}
          </span>
          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
            {subject.name}
          </h3>
        </div>

        {/* Mini Circular Progress Gauge */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="transparent"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="absolute text-[10px] font-mono font-bold text-white">
            {subject.progress}%
          </span>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] pl-1.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400 truncate">
          <User className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">
            {Array.isArray(subject.professors) && subject.professors.length > 0
              ? subject.professors[0]
              : (subject as any).professor || 'Prof.'}
          </span>
        </div>

        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-violet-300 group-hover:text-cyan-300 shrink-0 ml-1">
          <span>{subject.studyTimeHours}h</span>
          <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
