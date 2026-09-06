import React, { useState } from 'react';
import type { Subject } from '../../types';
import { PieChart, Clock } from 'lucide-react';

interface TimeDistributionChartProps {
  subjects: Subject[];
}

export const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({ subjects }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate total study time
  const totalHours = subjects.reduce((acc, s) => acc + s.studyTimeHours, 0);

  // Calculate percentages and stroke offsets for SVG Donut chart
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12

  let cumulativePercent = 0;
  const slices = subjects.map((subj, index) => {
    const percent = totalHours > 0 ? (subj.studyTimeHours / totalHours) * 100 : 0;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += percent;

    return {
      ...subj,
      percent: percent.toFixed(1),
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1c2438]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Tempo por Disciplina
            </h3>
            <p className="text-xs text-slate-400">
              Distribuição percentual de horas de estudo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141b2c] border border-[#232f4a] text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{totalHours}h totais</span>
        </div>
      </div>

      {/* Chart and Legend content */}
      <div className="py-6 flex flex-col md:flex-row items-center justify-around gap-6">
        {/* Donut Chart SVG */}
        <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#151c2d"
              strokeWidth="20"
            />

            {/* Slices */}
            {slices.map((slice) => {
              const isHovered = hoveredIndex === slice.index;
              return (
                <circle
                  key={slice.id}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 26 : 20}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}88)` : 'none',
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                  }}
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
            {activeSlice ? (
              <>
                <span className="text-xl font-extrabold text-white font-mono leading-none">
                  {activeSlice.percent}%
                </span>
                <span className="text-[10px] font-semibold text-slate-300 truncate max-w-[100px] mt-1">
                  {activeSlice.name.split(' ')[0]}
                </span>
                <span className="text-[9px] text-amber-400 font-mono">
                  {activeSlice.studyTimeHours} horas
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-white font-mono leading-none">
                  100%
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Distribuído
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {totalHours}h estudo
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend list */}
        <div className="w-full max-w-sm space-y-2.5">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  isHovered ? 'bg-[#182238] border border-[#2b3a5e]' : 'hover:bg-[#141b2c] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {slice.name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-2">
                  <span className="text-xs font-mono text-slate-400">
                    {slice.studyTimeHours}h
                  </span>
                  <span
                    className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#131926] border border-[#222a3d]"
                    style={{ color: slice.color }}
                  >
                    {slice.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="pt-3 border-t border-[#1c2438] flex items-center justify-between text-[11px] text-slate-400">
        <span>💡 Dica: O tempo é alimentado automaticamente via sessões de foco</span>
        <span className="text-sky-400 font-medium font-mono">Impacta 2026.2</span>
      </div>
    </div>
  );
};
