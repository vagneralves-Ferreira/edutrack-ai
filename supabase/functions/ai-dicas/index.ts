import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_DICAS: Record<string, string[]> = {
  "Visão Geral": [
    "Priorize hoje as entregas críticas da semana (Software Engineering e MVP de Innovation Lab) reservando um bloco Pomodoro de 50 minutos sem distrações.",
    "Comece revisando a disciplina com menor percentual de conclusão no seu cockpit para equilibrar o progresso antes das avaliações parciais.",
    "Divida sua sessão de hoje em dois blocos focados: 25 min para prática de queries SQL (JOIN e GROUP BY) e 25 min para revisão de modelagem 3FN.",
  ],
  "Disciplinas": [
    "Ao estudar cada matéria da grade, foque primeiro nos tópicos práticos cobrados nas avaliações parciais e marque os conteúdos já revisados.",
    "Para SQL Fundamentals e Database Design, pratique escrever consultas com INNER/LEFT JOIN e validar dependências funcionais na 3ª Forma Normal (3FN).",
    "Em Software Engineering, revise os diagramas de arquitetura C4 e os critérios de aceite do protótipo antes da entrega parcial.",
  ],
  "Tarefas & Prazos": [
    "Ataque primeiro os cartões com prioridade Crítica ou Avaliação MVP no Kanban antes de iniciar listas ou exercícios de menor peso.",
    "Mantenha no máximo 2 tarefas na coluna 'Em Andamento' por vez para evitar troca de contexto e concluir suas entregas mais rápido.",
    "Quebre as entregas maiores do Kanban em subtarefas de 25 minutos e use o Timer Pomodoro para avançar com consistência hoje.",
  ],
};

function escolherDicaFallback(tela: string, contexto?: Record<string, unknown>): string {
  const opcoes = FALLBACK_DICAS[tela] ?? FALLBACK_DICAS["Visão Geral"];
  const idx = Math.floor(Math.random() * opcoes.length);
  const base = opcoes[idx];

  if (contexto && typeof contexto.total === "number" && tela.includes("Tarefas")) {
    return `Com ${contexto.total} tarefas mapeadas no seu painel: ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }

  return base;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let tela = "Visão Geral";
  let contexto: Record<string, unknown> = {};

  try {
    const body = await req.json();
    if (body?.tela) tela = String(body.tela);
    if (body?.contexto && typeof body.contexto === "object") contexto = body.contexto;
  } catch {
    // Mantém valores padrão
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessao invalida. Faca login." }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const prompt = `Voce e o assistente de estudos do EduTrack AI, um planner academico de estudante universitario.
O usuario esta na tela "${tela}" do app. Contexto: ${JSON.stringify(contexto ?? {})}.
Gere UMA dica curta (maximo 2 frases), pratica e especifica para esse contexto, em portugues do Brasil.
Responda apenas com o texto da dica, sem titulos nem markdown.`;

    const chave = Deno.env.get("GEMINI_API_KEY") ?? "";
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

    if (chave) {
      for (const model of models) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 250,
                  temperature: 0.7,
                  ...(model.startsWith("gemini-2.5")
                    ? { thinkingConfig: { thinkingBudget: 0 } }
                    : {}),
                },
              }),
              signal: AbortSignal.timeout(4500),
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const parts = data?.candidates?.[0]?.content?.parts ?? [];
            const textPart = parts.find(
              (p: { text?: string }) => typeof p?.text === "string" && p.text.trim().length > 0
            );
            if (textPart?.text?.trim()) {
              return new Response(
                JSON.stringify({ dica: textPart.text.trim(), source: model }),
                { headers: { ...CORS, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (innerErr) {
          console.error(`Falha ao consultar ${model}:`, innerErr);
        }
      }
    }

    // Fallback inteligente caso a cota da API externa oscile
    const dicaFallback = escolherDicaFallback(tela, contexto);
    return new Response(
      JSON.stringify({ dica: dicaFallback, source: "fallback" }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Falha geral:", err);
    return new Response(
      JSON.stringify({ dica: escolherDicaFallback(tela, contexto), source: "fallback" }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
