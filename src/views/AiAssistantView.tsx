import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  CheckCircle2
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { formatDateBR } from '../utils/helpers';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  checklist?: string[];
}

export const AiAssistantView: React.FC = () => {
  const { setActiveTab, subjects, tasks } = usePlanner();
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const institutionLabel = currentUser?.institution || 'sua faculdade';

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const initialChecklist =
    pendingTasks.length > 0
      ? pendingTasks.slice(0, 4).map(
          (t) =>
            `${formatDateBR(t.dueDate)}: ${t.title} — ${t.subjectName} • Prioridade ${t.priority.toUpperCase()}`
        )
      : [
          'Todas as suas tarefas atuais estão concluídas! Use o botão Nova Tarefa ou sincronize seu Classroom para importar novas entregas.',
        ];

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Olá! Sou o EduTrack AI, seu copiloto acadêmico (${institutionLabel}). Analisei suas ${subjects.length} disciplinas e ${tasks.length} atividades cadastradas (${pendingTasks.length} pendentes):`,
      timestamp: 'Agora',
      checklist: initialChecklist,
    },
  ]);

  const buildDynamicReply = (question: string): { text: string; checklist: string[] } => {
    const lower = question.toLowerCase();
    const matchedSubject = subjects.find(
      (s) =>
        lower.includes(s.name.toLowerCase()) ||
        s.name
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 3 && lower.includes(word)) ||
        (s.professors || []).some((p) => p.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lower.includes(w)))
    );

    if (matchedSubject) {
      const subTasks = tasks.filter(
        (t) =>
          t.subjectId === matchedSubject.id ||
          t.subjectName.toLowerCase() === matchedSubject.name.toLowerCase()
      );
      const subPending = subTasks.filter((t) => t.status !== 'completed');
      const profs = (matchedSubject.professors || []).join(', ') || 'Prof. Responsável';

      return {
        text: `Análise em tempo real de ${matchedSubject.name} (${profs}): você está com ${matchedSubject.progress}% de avanço, ${subPending.length} pendência(s) e ${matchedSubject.materials?.length || 0} material(is) de estudo sincronizados.`,
        checklist:
          subPending.length > 0
            ? subPending.slice(0, 4).map(
                (t) => `${formatDateBR(t.dueDate)}: ${t.title} • Prioridade ${t.priority.toUpperCase()}`
              )
            : [
                'Nenhuma entrega pendente nesta disciplina! Revise os materiais em Disciplinas para fixar o conteúdo.',
              ],
      };
    }

    const sortedPending = [...pendingTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const lowestProgress = [...subjects].sort((a, b) => a.progress - b.progress)[0];

    return {
      text: `Analisando seus dados reais (${subjects.length} disciplinas e ${pendingTasks.length} entregas pendentes em ${institutionLabel}): recomendo priorizar os prazos mais próximos e equilibrar ${lowestProgress ? `${lowestProgress.name} (${lowestProgress.progress}%)` : 'as matérias em aberto'}.`,
      checklist:
        sortedPending.length > 0
          ? [
              ...sortedPending.slice(0, 3).map(
                (t) => `${formatDateBR(t.dueDate)}: ${t.title} — ${t.subjectName}`
              ),
              'Use um bloco Pomodoro de 25 a 50 min focado na entrega do topo da lista.',
            ]
          : [
              'Todas as suas entregas estão em dia! Aproveite para revisar os materiais anexados em Disciplinas.',
              'Mantenha sessões curtas no Pomodoro para consolidar os tópicos da semana.',
            ],
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isThinking) return;

    const cleanQuestion = text.trim();
    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: cleanQuestion,
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsThinking(true);

    const dynamicFallback = buildDynamicReply(cleanQuestion);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && import.meta.env.VITE_SUPABASE_URL) {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dicas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tela: 'AI Copilot',
            contexto: {
              pergunta: cleanQuestion,
              instituicao: institutionLabel,
              disciplinas: subjects.map((s) => ({ nome: s.name, progresso: s.progress })),
              pendentes: pendingTasks.slice(0, 8).map((t) => ({
                titulo: t.title,
                disciplina: t.subjectName,
                prazo: t.dueDate,
                prioridade: t.priority,
              })),
            },
          }),
          signal: AbortSignal.timeout(5000),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.dica) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai-' + Date.now(),
              sender: 'ai',
              text: String(data.dica),
              timestamp: 'Agora',
              checklist: dynamicFallback.checklist,
            },
          ]);
          return;
        }
      }
    } catch {
      // Fallback dinâmico local baseado nos dados reais do aluno
    } finally {
      setIsThinking(false);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: dynamicFallback.text,
        timestamp: 'Agora',
        checklist: dynamicFallback.checklist,
      },
    ]);
  };

  const quickPrompts = [
    pendingTasks[0]
      ? `⚡ Plano de ação para: ${pendingTasks[0].title}`
      : '⚡ Como organizar meu cronograma semanal de estudos?',
    subjects[0]
      ? `📚 Principais tópicos de ${subjects[0].name}`
      : '📚 Estratégias de revisão para provas e entregas',
    '🚀 Checklist para entregas de projeto e MVP',
    '⏱️ Como usar Pomodoro para render mais nas matérias',
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isLight ? 'border-slate-200' : 'border-white/[0.08]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div
              className={`w-full h-full rounded-[11px] flex items-center justify-center ${
                isLight ? 'bg-white' : 'bg-[#0e121d]'
              }`}
            >
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          <div>
            <h2
              className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              EduTrack AI Advisor
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}
              >
                Assistente de Estudos
              </span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Orientação personalizada baseada nas suas disciplinas e prazos ({institutionLabel})
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`text-xs font-semibold cursor-pointer ${
            isLight ? 'text-indigo-600 hover:text-indigo-500' : 'text-sky-400 hover:text-sky-300'
          }`}
        >
          &larr; Voltar ao Cockpit
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className={`text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between group ${
              isLight
                ? 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-800 shadow-sm'
                : 'bg-[#0f1422] hover:bg-[#151c2d] border-white/[0.08] hover:border-indigo-500/40 text-slate-200 hover:text-white'
            }`}
          >
            <span className="truncate">{prompt}</span>
            <span className="text-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity text-xs ml-2">
              &rarr;
            </span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div
        className={`bento-card rounded-2xl p-5 shadow-xl min-h-[450px] flex flex-col justify-between ${
          isLight ? 'bg-white/95 border border-slate-200' : 'bg-[#0f1422] border border-white/[0.08]'
        }`}
      >
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                    isLight
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                      : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20'
                    : isLight
                    ? 'bg-slate-100 border border-slate-200 text-slate-800'
                    : 'bg-[#141b2c] border border-white/[0.08] text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span
                    className={`font-bold text-[11px] ${
                      msg.sender === 'user'
                        ? 'text-white'
                        : isLight
                        ? 'text-indigo-700'
                        : 'text-indigo-400'
                    }`}
                  >
                    {msg.sender === 'user' ? 'Você' : 'EduTrack AI'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      msg.sender === 'user'
                        ? 'text-white/80'
                        : isLight
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                <p>{msg.text}</p>

                {msg.checklist && (
                  <div
                    className={`mt-3 pt-3 border-t space-y-2 ${
                      isLight ? 'border-slate-200' : 'border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        isLight ? 'text-indigo-700' : 'text-amber-300'
                      }`}
                    >
                      Checklist Recomendado:
                    </span>
                    {msg.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 ${
                          isLight ? 'text-slate-700' : 'text-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isLight
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                      : 'bg-slate-800 border-slate-700 text-amber-400'
                  }`}
                >
                  EU
                </div>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="flex gap-3 justify-start">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                  isLight
                    ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                    : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                }`}
              >
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div
                className={`rounded-2xl px-4 py-3 text-xs animate-pulse ${
                  isLight
                    ? 'bg-slate-100 border border-slate-200 text-slate-600'
                    : 'bg-[#141b2c] border border-white/[0.08] text-slate-300'
                }`}
              >
                Analisando suas disciplinas e prazos com IA...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className={`mt-5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/[0.08]'}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Pergunte sobre suas matérias, entregas, código ou provas (${institutionLabel})...`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className={`flex-1 px-4 py-3 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-500'
                  : 'bg-[#141b2c] border-white/[0.1] text-white placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white transition-all cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
