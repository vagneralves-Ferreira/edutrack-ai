import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

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

  try {
    const { tela, contexto } = await req.json();
    const prompt = `Voce e o assistente de estudos do EduTrack AI, um planner academico de estudante universitario.
O usuario esta na tela "${tela}" do app. Contexto: ${JSON.stringify(contexto ?? {})}.
Gere UMA dica curta (maximo 2 frases), pratica e especifica para esse contexto, em portugues do Brasil.
Responda apenas com o texto da dica, sem titulos nem markdown.`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200 },
        }),
      }
    );

    if (!geminiRes.ok) {
      return new Response(JSON.stringify({ error: `Gemini respondeu ${geminiRes.status}` }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await geminiRes.json();
    const dica = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return new Response(JSON.stringify({ dica: dica ?? "Nao consegui gerar a dica agora." }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
