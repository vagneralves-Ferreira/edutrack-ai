import type { TaskType, Priority, Subject } from '../types';

/**
 * The MVP evaluation is exclusive to Innovation Lab (IMP-INN303).
 * Matches by course code first, then by the seed id, then by a normalized name
 * (Classroom/Supabase subjects may have UUID ids or slightly different names).
 */
export function isInnovationLabSubject(
  subject?: Pick<Subject, 'id' | 'code' | 'name'> | null
): boolean {
  if (!subject) return false;
  const code = (subject.code || '').toUpperCase().replace(/[\s_-]/g, '');
  if (code.includes('INN303')) return true;
  if (subject.id === 'innovation-lab') return true;
  const name = (subject.name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return /\binnovation\s*lab\b/.test(name);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function getDaysRemaining(dueDateStr: string): {
  days: number;
  label: string;
  isUrgent: boolean;
  isToday: boolean;
  isPast: boolean;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dueDateStr + 'T00:00:00');
  
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { days: diffDays, label: 'Atrasada', isUrgent: true, isToday: false, isPast: true };
  }
  if (diffDays === 0) {
    return { days: 0, label: 'Hoje!', isUrgent: true, isToday: true, isPast: false };
  }
  if (diffDays === 1) {
    return { days: 1, label: 'Amanhã!', isUrgent: true, isToday: false, isPast: false };
  }
  if (diffDays <= 3) {
    return { days: diffDays, label: `Em ${diffDays} dias`, isUrgent: true, isToday: false, isPast: false };
  }
  return { days: diffDays, label: `Em ${diffDays} dias`, isUrgent: false, isToday: false, isPast: false };
}

export function getGreeting(userName = 'Estudante'): { greeting: string; period: string } {
  const hour = new Date().getHours();
  let greeting = 'Boa noite';
  let period = 'noite';

  if (hour >= 5 && hour < 12) {
    greeting = 'Bom dia';
    period = 'manhã';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
    period = 'tarde';
  }

  return {
    greeting: `${greeting}, ${userName}`,
    period
  };
}

export function getTaskTypeBadge(type: TaskType): { label: string; color: string; bg: string; border: string } {
  switch (type) {
    case 'avaliacao_mvp':
      return { 
        label: 'Avaliação Parcial MVP', 
        color: 'text-amber-300', 
        bg: 'bg-amber-500/20', 
        border: 'border-amber-500/40' 
      };
    case 'avaliacao':
      return { 
        label: 'Avaliação Parcial', 
        color: 'text-amber-300', 
        bg: 'bg-amber-500/15', 
        border: 'border-amber-500/30' 
      };
    case 'exercicio':
      return { 
        label: 'Exercício Prático', 
        color: 'text-sky-300', 
        bg: 'bg-sky-500/15', 
        border: 'border-sky-500/30' 
      };
    case 'lista':
      return { 
        label: 'Lista de Exercícios', 
        color: 'text-emerald-300', 
        bg: 'bg-emerald-500/15', 
        border: 'border-emerald-500/30' 
      };
    case 'laboratorio':
      return { 
        label: 'Laboratório', 
        color: 'text-purple-300', 
        bg: 'bg-purple-500/15', 
        border: 'border-purple-500/30' 
      };
    case 'leitura':
      return { 
        label: 'Leitura Complementar', 
        color: 'text-indigo-300', 
        bg: 'bg-indigo-500/15', 
        border: 'border-indigo-500/30' 
      };
    case 'projeto':
      return { 
        label: 'Projeto Integrador', 
        color: 'text-teal-300', 
        bg: 'bg-teal-500/15', 
        border: 'border-teal-500/30' 
      };
    case 'revisao':
    default:
      return { 
        label: 'Revisão Teórica', 
        color: 'text-slate-300', 
        bg: 'bg-slate-500/15', 
        border: 'border-slate-500/30' 
      };
  }
}

export function getPriorityBadge(priority: Priority): { label: string; color: string; bg: string; border: string } {
  switch (priority) {
    case 'critica':
      return { 
        label: 'Crítica', 
        color: 'text-rose-400', 
        bg: 'bg-rose-500/15', 
        border: 'border-rose-500/30' 
      };
    case 'alta':
      return { 
        label: 'Alta', 
        color: 'text-orange-400', 
        bg: 'bg-orange-500/15', 
        border: 'border-orange-500/30' 
      };
    case 'media':
      return { 
        label: 'Média', 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20' 
      };
    case 'baixa':
    default:
      return { 
        label: 'Baixa', 
        color: 'text-slate-400', 
        bg: 'bg-slate-500/10', 
        border: 'border-slate-500/20' 
      };
  }
}
