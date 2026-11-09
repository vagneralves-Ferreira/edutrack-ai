import React from 'react';
import { usePlanner } from '../context/PlannerContext';
import { useTimer } from '../context/TimerContext';
import { Timer as TimerIcon, Play, Pause, RotateCcw, Check, Sparkles, Activity } from 'lucide-react';

export const TimerView: React.FC = () => {
  const { subjects, setActiveTab } = usePlanner();
  const {
    mode,
    setMode,
    isActive,
    toggleTimer,
    resetTimer,
    selectedSubjectId,
    setSelectedSubjectId,
    sessionCompleted,
    minutes,
    seconds,
    progressPercentage
  } = useTimer();

  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
          <TimerIcon className="w-3.5 h-3.5" />
          <span>Cronômetro de Foco & Estudo Acadêmico</span>
          {isActive && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium pl-1 border-l border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ativo em 2º plano
            </span>
          )}
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
          Sessão Produtiva para Avaliações
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          O cronômetro roda continuamente em segundo plano durante a navegação e computa as horas automaticamente no Gráfico de Tempo por Disciplina.
        </p>
      </div>

      {/* Main Timer Container */}
      <div className="rounded-3xl bg-[#0f1422] border border-[#1e273d] p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Progress Bar */}
        <div className="w-full bg-[#141b2c] h-1.5 rounded-full mb-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Subject Picker */}
        <div className="relative z-10 max-w-sm mx-auto mb-6">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-left flex items-center justify-between">
            <span>Disciplina em Foco:</span>
            {isActive && (
              <span className="text-[10px] text-amber-400 font-normal flex items-center gap-1">
                <Activity className="w-3 h-3 animate-spin" /> Contando tempo
              </span>
            )}
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={isActive}
            className={`w-full px-4 py-2.5 rounded-xl bg-[#141b2c] border border-[#232f4a] text-white text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer ${
              isActive ? 'opacity-80 cursor-not-allowed' : ''
            }`}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.professors[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex p-1 rounded-2xl bg-[#141b2c] border border-[#232f4a] text-xs font-semibold mb-8">
          <button
            onClick={() => setMode('pomodoro')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'pomodoro' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pomodoro (25 min)
          </button>
          <button
            onClick={() => setMode('deepWork')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'deepWork' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Foco Profundo (50 min)
          </button>
          <button
            onClick={() => setMode('shortBreak')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'shortBreak' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pausa Curta (5 min)
          </button>
        </div>

        {/* Countdown Display */}
        <div className="my-6">
          <div className="font-mono text-7xl sm:text-8xl font-black tracking-tight text-white select-none">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-xs text-sky-400 font-medium mt-2">
            Matéria: {currentSubject ? currentSubject.name : 'Geral'} • Total acumulado: {currentSubject ? currentSubject.studyTimeHours : 0}h
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer active:scale-95 ${
              isActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? 'Pausar Sessão' : 'Iniciar Foco'}</span>
          </button>

          <button
            onClick={resetTimer}
            className="p-3.5 rounded-2xl bg-[#141b2c] hover:bg-[#1a2338] border border-[#232f4a] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reiniciar Cronômetro"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {sessionCompleted && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Parabéns! Sessão computada com sucesso no gráfico de tempo da Impacta.</span>
          </div>
        )}
      </div>

      {/* Footer Info Card */}
      <div className="p-4 rounded-2xl bg-[#0f1422] border border-[#1e273d] flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Precisa revisar conteúdos para as Avaliações Parciais e o MVP de 08/09 ou 10/09?
        </span>
        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
        >
          <span>Abrir EduTrack AI Advisor</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
};
