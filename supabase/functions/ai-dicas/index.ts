import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  buildExtractDocumentGeminiBody,
  parseExtractDocumentResponse,
  validateDocumentRequest,
} from "./extractDocument.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const FALLBACK_DICAS: Record<string, string[]> = {
  "Visão Geral": [
    "Priorize hoje as entregas com prazo mais próximo reservando um bloco Pomodoro de 50 minutos sem distrações.",
    "Comece revisando a disciplina com menor percentual de conclusão no seu painel para equilibrar o progresso antes das avaliações.",
    "Divida sua sessão de hoje em dois blocos focados: um para exercícios práticos e outro para revisão dos conteúdos principais.",
  ],
  "Disciplinas": [
    "Ao estudar cada matéria da grade, foque primeiro nos tópicos práticos cobrados nas avaliações e marque os conteúdos já revisados.",
    "Crie resumos curtos ao final de cada aula para reduzir o tempo de revisão na véspera das provas.",
    "Combine a leitura dos materiais de apoio com exercícios práticos para fixar melhor os conceitos cobrados.",
  ],
  "Tarefas & Prazos": [
    "Conclua primeiro as entregas de maior prioridade no quadro antes de iniciar atividades secundárias.",
    "Mantenha no máximo 2 tarefas em 'Em Andamento' por vez para evitar troca de contexto e concluir suas entregas mais rápido.",
    "Quebre as entregas maiores em blocos de 25 minutos e use o Timer Pomodoro para avançar com consistência hoje.",
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
  let mode = "tip";
  let rawPortalText = "";
  let portalName = "Portal Acadêmico";
  let fileBase64: unknown = undefined;
  let mimeType: unknown = undefined;

  try {
    const body = await req.json();
    if (body?.tela) tela = String(body.tela);
    if (body?.contexto && typeof body.contexto === "object") contexto = body.contexto;
    if (body?.mode) mode = String(body.mode);
    if (body?.text) rawPortalText = String(body.text).slice(0, 8000);
    if (body?.portalName) portalName = String(body.portalName).slice(0, 80);
    if (body?.fileBase64 !== undefined) fileBase64 = body.fileBase64;
    if (body?.mimeType !== undefined) mimeType = body.mimeType;
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
      return jsonResponse({ error: "Sessão inválida ou expirada. Faça login novamente." }, 401);
    }

    const chave = Deno.env.get("GEMINI_API_KEY") ?? "";
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

    if (mode === "extract_document") {
      const validation = validateDocumentRequest({ fileBase64, mimeType });
      if (!validation.ok) {
        return jsonResponse({ error: validation.error }, validation.status);
      }

      if (!chave) {
        return jsonResponse(
          {
            error:
              "O serviço de análise inteligente está temporariamente indisponível. Tente novamente em alguns instantes.",
          },
          503
        );
      }

      for (const model of models) {
        try {
          const geminiBody = buildExtractDocumentGeminiBody({
            fileBase64: validation.fileBase64,
            mimeType: validation.mimeType,
            model,
          });

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
              body: JSON.stringify(geminiBody),
              signal: AbortSignal.timeout(25000),
            }
          );

          if (!geminiRes.ok) {
            console.error(`Gemini extract_document HTTP ${geminiRes.status} em ${model}`);
            continue;
          }

          const data = await geminiRes.json();
          const parts = data?.candidates?.[0]?.content?.parts ?? [];
          const textPart = parts.find(
            (p: { text?: string }) => typeof p?.text === "string" && p.text.trim().length > 0
          );

          if (!textPart?.text) {
            continue;
          }

          const parsed = parseExtractDocumentResponse(textPart.text);
          if (parsed.ok) {
            return jsonResponse({
              subjects: parsed.data.subjects,
              tasks: parsed.data.tasks,
              source: model,
            });
          }

          if (parsed.reason === "no_academic_data") {
            return jsonResponse({ error: parsed.error }, 422);
          }
        } catch (innerErr) {
          console.error(`Falha na extração de documento via ${model}:`, innerErr);
        }
      }

      return jsonResponse(
        {
          error:
            "Não foi possível analisar este arquivo agora. Tente novamente em alguns instantes ou envie uma captura mais nítida da sua grade.",
        },
        503
      );
    }

    if (mode === "extract_portal") {
      if (!rawPortalText.trim()) {
        return new Response(JSON.stringify({ subjects: [], tasks: [], source: "empty" }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const extractPrompt = `Você extrai disciplinas universitárias e prazos/atividades de texto copiado de portais acadêmicos (${portalName}). Data atual: ${todayIso}.
Responda APENAS com um JSON válido no formato exato:
{"subjects":[{"name":"Nome da Disciplina","code":"CODIGO_OPCIONAL","professor":"Professor Opcional"}],"tasks":[{"title":"Nome da Atividade","courseName":"Nome da Disciplina","dueDate":"YYYY-MM-DD ou null","description":"Resumo curto opcional"}]}
Regras:
- Extraia apenas disciplinas reais e entregas/provas/atividades reais presentes no texto.
- Ignore menus, botões, rodapés, links de suporte, avisos genéricos e texto irrelevante.
- Não invente itens nem datas. Se não houver data, use null.
- Responda somente o JSON puro, sem markdown ou explicações.

TEXTO DO PORTAL:
${rawPortalText}`;

      if (chave) {
        for (const model of models) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: extractPrompt }] }],
                  generationConfig: {
                    maxOutputTokens: 1800,
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    ...(model.startsWith("gemini-2.5")
                      ? { thinkingConfig: { thinkingBudget: 0 } }
                      : {}),
                  },
                }),
                signal: AbortSignal.timeout(9000),
              }
            );

            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const parts = data?.candidates?.[0]?.content?.parts ?? [];
              const textPart = parts.find(
                (p: { text?: string }) => typeof p?.text === "string" && p.text.trim().length > 0
              );
              if (textPart?.text) {
                const cleaned = textPart.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
                const parsed = JSON.parse(cleaned);
                const subjects = Array.isArray(parsed?.subjects) ? parsed.subjects : [];
                const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
                return new Response(
                  JSON.stringify({ subjects, tasks, source: model }),
                  { headers: { ...CORS, "Content-Type": "application/json" } }
                );
              }
            }
          } catch (innerErr) {
            console.error(`Falha na extração assistida via ${model}:`, innerErr);
          }
        }
      }

      return new Response(
        JSON.stringify({ subjects: [], tasks: [], source: "unavailable" }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Voce e o assistente de estudos do EduTrack AI, um planner academico de estudante universitario.
O usuario esta na tela "${tela}" do app. Contexto: ${JSON.stringify(contexto ?? {})}.
Gere UMA dica curta (maximo 2 frases), pratica e especifica para esse contexto, em portugues do Brasil.
Responda apenas com o texto da dica, sem titulos nem markdown.`;

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
    if (mode === "extract_document") {
      return jsonResponse(
        { error: "Ocorreu um erro ao analisar o arquivo enviado. Tente novamente em instantes." },
        500
      );
    }
    return jsonResponse({ dica: escolherDicaFallback(tela, contexto), source: "fallback" });
  }
});
