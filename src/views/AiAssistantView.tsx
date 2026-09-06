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
      text: 'Olá! Sou o EduTrack AI, seu copiloto acadêmico personalizado para a Faculdade Impacta Tecnologia. Como as Avaliações Parciais e a Avaliação Parcial MVP de Innovation Lab ocorrem nesta semana (08/09 e 10/09), montei um plano tático de estudo.',
      timestamp: 'Hoje, 19:30',
      checklist: [
        '08/09: Revisar arquitetura C4 e protótipo funcional para o Prof. Fábio Nogueira (Software Engineering)',
        '08/09: Validar automação e webhooks no ambiente Low-Code para a Avaliação Parcial MVP (Innovation Lab)',
        '10/09: Praticar INNER/LEFT JOIN e agregações com GROUP BY para o Prof. Evandro (SQL Fundamentals)',
        '10/09: Checar dependências funcionais e modelo 3FN (Database Design)'
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
          text: 'Para a Avaliação Parcial MVP de Innovation Lab: Advanced No/Low Code (08/09), o foco é validação em produção e valor tangível:',
          timestamp: 'Agora',
          checklist: [
            'Verifique se os endpoints e webhooks estão respondendo com status 200 em homologação.',
            'Documente a hipótese de negócio e métricas iniciais de validação do MVP.',
            'Prepare um fluxo de ponta a ponta sem interrupções manuais para a demonstração.'
          ]
        };
      } else if (lower.includes('08/09') || lower.includes('software engineering') || lower.includes('fábio')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Para a Avaliação Parcial de 08/09 com o Prof. Fábio Nogueira (Software Engineering), a Impacta prioriza clareza arquitetural e entrega de valor:',
          timestamp: 'Agora',
          checklist: [
            'Garanta que seu repositório Git tenha README detalhado com instruções de execução.',
            'Defina claramente o escopo do protótipo versus entregas futuras.',
            'Prepare a justificativa das escolhas técnicas: por que utilizou determinada arquitetura (ex: Clean Architecture ou Monólito Modular)?'
          ]
        };
      } else if (lower.includes('10/09') || lower.includes('sql') || lower.includes('evandro') || lower.includes('database')) {
        aiResponse = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: 'Para as avaliações de 10/09 (SQL Fundamentals e Database Design com o Prof. Evandro), o foco total deve ser consistência relacional e performance:',
          timestamp: 'Agora',
          checklist: [
            'Revise a sintaxe de JOINs múltiplos e certifique-se de não criar produto cartesiano acidental.',
            'Treine a cláusula HAVING: lembre-se de que HAVING filtra grupos, enquanto WHERE filtra tuplas individuais.',
            'Na 3ª Forma Normal (3FN), elimine dependências transitivas: nenhum atributo não-chave pode depender de outro atributo não-chave.'
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
    '🎯 Como se preparar para a entrega de 08/09 (Software Eng.)?',
    '🚀 Dicas para a Avaliação Parcial MVP de Innovation Lab (08/09)',
    '⚡ Dicas para a prova de SQL com o Prof. Evandro (10/09)',
    '📊 Resumo de Big-O para a aula de Algoritmos'
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
