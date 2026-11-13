import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  CheckCircle2
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  checklist?: string[];
}

export const AiAssistantView: React.FC = () => {
  const { setActiveTab } = usePlanner();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: 'Olá! Sou o EduTrack AI, seu copiloto acadêmico sincronizado com seu Google Classroom da Faculdade Impacta Tecnologia. Analisei suas 5 disciplinas e suas 6 atividades do Classroom e montei seu plano de ação para as 3 entregas pendentes:',
      timestamp: 'Hoje, 19:30',
      checklist: [
        '07/11/2026: Desafio da Procedure — SQL Fundamentals (Prof. Evandro) • Prioridade Alta',
        '19/11/2026: Tarefas a serem realizadas (Upload Markdown e Docs) — Innovation Lab • Prioridade Média',
        '23/11/2026: Entrega final do Projeto (MVP) — Innovation Lab: Advanced No/Low Code • Em Andamento (Prioridade Alta)',
        'Concluídas em Software Engineering: Avaliação Parcial 02 (21/10), TA: Uso do Modelo Cascata (22/08) e Dinâmica Modelos de Desenvolvimento (02/09)'
      ]
    }
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
          text: 'Para SQL Fundamentals, Database Design e Innovation Lab com o Prof. Evandro (destaque para Desafio da Procedure em 07/11), foque em:',
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
    '⚡ Dicas para o Desafio da Procedure em SQL Fundamentals (07/11)',
    '📄 Como organizar as Tarefas a serem realizadas (Markdown e Docs - 19/11)?',
    '🚀 Checklist para a Entrega final do Projeto MVP (Innovation Lab - 23/11)',
    '📊 Revisão das atividades concluídas de Software Engineering'
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c2438]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0e121d] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              EduTrack AI Advisor
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Assistente de Estudos
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Orientação personalizada baseada no corpo docente e cronograma da Impacta
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('dashboard')}
          className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
        >
          &larr; Voltar ao Dashboard
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="text-left p-2.5 rounded-xl bg-[#0f1422] hover:bg-[#151c2d] border border-[#1e273d] hover:border-[#2b3a5c] text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
          >
            <span className="truncate">{prompt}</span>
            <span className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">&rarr;</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-5 shadow-xl min-h-[450px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-medium'
                    : 'bg-[#141b2c] border border-[#232f4a] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`font-bold text-[11px] ${msg.sender === 'user' ? 'text-slate-900' : 'text-indigo-400'}`}>
                    {msg.sender === 'user' ? 'Você' : 'EduTrack AI'}
                  </span>
                  <span className={`text-[10px] ${msg.sender === 'user' ? 'text-slate-800' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                <p>{msg.text}</p>

                {msg.checklist && (
                  <div className="mt-3 pt-3 border-t border-[#202b44] space-y-2">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                      Checklist Recomendado:
                    </span>
                    {msg.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                  EU
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="mt-5 pt-3 border-t border-[#1c2438]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Faça uma pergunta sobre as matérias, código, SQL ou provas da Impacta..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-[#141b2c] border border-[#232f4a] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-400"
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
