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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Olá! Sou o EduTrack AI, seu copiloto acadêmico (${institutionLabel}). Analisei suas ${subjects.length} disciplinas e ${tasks.length} atividades cadastradas (${pendingTasks.length} pendentes):`,
      timestamp: 'Agora',
      checklist: initialChecklist,
    },
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: 'Agora'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');

    // Simulated contextual AI response
    setTimeout(() => {
      let aiResponse: Message;
      const lower = text.toLowerCase();

      if (lower.includes('innovation') || lower.includes('low-code') || lower.includes('mvp')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Para Innovation Lab: Advanced No/Low Code com o Prof. Evandro (Tarefas 19/11 e Entrega Final do Projeto 23/11), o foco é validação em produção e entregas completas:',
          timestamp: 'Agora',
          checklist: [
            'Confirme o upload de todas as tarefas e arquivos Markdown/Docs solicitados para 19/11.',
            'Verifique se o EduTrack AI em produção na Vercel e no Supabase está funcionando sem erros.',
            'Prepare a demonstração ponta a ponta da Entrega Final do Projeto para 23/11.'
          ]
        };
      } else if (lower.includes('software engineering') || lower.includes('fábio') || lower.includes('uml') || lower.includes('cascata')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Em Software Engineering com o Prof. Fábio Nogueira, suas entregas registradas no Classroom estão concluídas (Cascata, UML 2.5 e AP2). Confira os pontos-chave de revisão:',
          timestamp: 'Agora',
          checklist: [
            'Garanta que seu repositório Git tenha README detalhado com instruções de execução.',
            'Mantenha os diagramas UML e especificações de requisitos organizados.',
            'Revise os modelos de desenvolvimento (Cascata, Ágil, Scrum e Kanban).'
          ]
        };
      } else if (lower.includes('sql') || lower.includes('procedure') || lower.includes('evandro') || lower.includes('database')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Para SQL Fundamentals e Innovation Lab com o Prof. Evandro (destaque para Desafio da Procedure em 07/11) e revisão de Database Design, foque em:',
          timestamp: 'Agora',
          checklist: [
            'Valide parâmetros de entrada/saída e tratamento de erros na Stored Procedure do Desafio.',
            'Revise JOINs múltiplos e agregações com GROUP BY e HAVING.',
            'Na 3ª Forma Normal (3FN), elimine dependências transitivas entre atributos não-chave.'
          ]
        };
      } else if (lower.includes('algoritmos') || lower.includes('odair') || lower.includes('joão')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Com os professores Odair e João Roberto em Programming & Algorithms, preste atenção especial à análise assintótica Big-O:',
          timestamp: 'Agora',
          checklist: [
            'QuickSort: O(n log n) no caso médio, O(n²) no pior caso (pivô inadequado).',
            'MergeSort: Sempre O(n log n), estável, mas consome O(n) de memória auxiliar.',
            'Recursão: Certifique-se sempre de identificar a condição de parada (caso base) para evitar estouro de pilha (StackOverflow).'
          ]
        };
      } else {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: `Analisando seu plano para "${text}": Recomendo bloquear 1 bloco Pomodoro de 50 minutos na seção de Estudo e focar nas pendências de maior peso percentual da semana!`,
          timestamp: 'Agora',
          checklist: [
            'Revise o checklist das Avaliações Parciais e MVP no Dashboard.',
            'Divida o tempo proporcionalmente ao peso de cada matéria na sua média.',
            'Faça ao menos 3 exercícios práticos antes de ir para a prova teórica.'
          ]
        };
      }

      setMessages(prev => [...prev, aiResponse]);
    }, 600);
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
