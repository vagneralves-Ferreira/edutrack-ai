export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export interface ExtractedDocumentSubject {
  nome: string;
  codigo: string;
  professor: string;
}

export interface ExtractedDocumentTask {
  titulo: string;
  subjectNome: string;
  data_entrega: string | null;
  descricao: string;
}

export interface ExtractedDocumentResult {
  subjects: ExtractedDocumentSubject[];
  tasks: ExtractedDocumentTask[];
}

export type DocumentValidationResult =
  | {
      ok: true;
      fileBase64: string;
      mimeType: AllowedDocumentMimeType;
      byteSize: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export type DocumentParseResult =
  | {
      ok: true;
      data: ExtractedDocumentResult;
    }
  | {
      ok: false;
      reason: "invalid_json" | "no_academic_data";
      error: string;
    };

export const UNREADABLE_DOCUMENT_ERROR =
  "Não encontramos disciplinas ou prazos acadêmicos legíveis neste arquivo. Tente enviar o PDF do comprovante de matrícula, calendário acadêmico ou um print mais nítido da tela do seu portal.";

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_DOCUMENT_MIME_TYPES);

const PORTUGUESE_MONTHS: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripBase64DataUrl(raw: string): string {
  const trimmed = raw.trim();
  const commaIdx = trimmed.startsWith("data:") ? trimmed.indexOf(",") : -1;
  const payload = commaIdx >= 0 ? trimmed.slice(commaIdx + 1) : trimmed;
  return payload.replace(/\s+/g, "");
}

export function estimateBase64ByteSize(cleanBase64: string): number {
  if (!cleanBase64) return 0;
  const padding = cleanBase64.endsWith("==") ? 2 : cleanBase64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((cleanBase64.length * 3) / 4) - padding);
}

export function validateDocumentRequest(input: {
  fileBase64?: unknown;
  mimeType?: unknown;
}): DocumentValidationResult {
  const normalizedMime = typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  if (!ALLOWED_MIME_SET.has(normalizedMime)) {
    return {
      ok: false,
      status: 400,
      error:
        "Formato de arquivo não suportado. Envie um PDF ou uma imagem PNG, JPG ou WEBP.",
    };
  }

  if (typeof input.fileBase64 !== "string" || !input.fileBase64.trim()) {
    return {
      ok: false,
      status: 400,
      error:
        "Nenhum arquivo válido foi recebido. Selecione um PDF ou imagem da sua grade e tente novamente.",
    };
  }

  const cleanBase64 = stripBase64DataUrl(input.fileBase64);
  if (
    !cleanBase64 ||
    cleanBase64.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)
  ) {
    return {
      ok: false,
      status: 400,
      error:
        "O arquivo enviado está corrompido ou em formato inválido. Tente selecionar o arquivo novamente.",
    };
  }

  const byteSize = estimateBase64ByteSize(cleanBase64);
  if (byteSize <= 0) {
    return {
      ok: false,
      status: 400,
      error:
        "O arquivo enviado está vazio. Selecione um PDF ou print da sua grade acadêmica.",
    };
  }

  if (byteSize > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      status: 413,
      error:
        "O arquivo ultrapassa o limite máximo de 5 MB. Envie um PDF menor ou um print recortado da sua grade.",
    };
  }

  return {
    ok: true,
    fileBase64: cleanBase64,
    mimeType: normalizedMime as AllowedDocumentMimeType,
    byteSize,
  };
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeDocumentDate(
  raw: unknown,
  fallbackYear = new Date().getFullYear()
): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text || /^(null|undefined|sem data|sem prazo|n\/a|-)$/i.test(text)) {
    return null;
  }

  // ISO YYYY-MM-DD (also matches ISO timestamps like 2026-11-28T23:59:00Z)
  const isoMatch = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (isValidCalendarDate(y, m, d)) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    return null;
  }

  // DD/MM/YYYY, DD/MM/YY, DD/MM or DD-MM-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const d = Number(slashMatch[1]);
    const m = Number(slashMatch[2]);
    const yRaw = slashMatch[3];
    const y = yRaw
      ? Number(yRaw.length === 2 ? `20${yRaw}` : yRaw)
      : fallbackYear;
    if (isValidCalendarDate(y, m, d)) {
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return null;
  }

  // Portuguese month format: "15 de dez. de 2026", "07 nov", "20 de novembro"
  const ptMatch = text
    .toLowerCase()
    .match(
      /\b(\d{1,2})\s+(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç.]*(?:\s+(?:de\s+)?(20\d{2}))?\b/i
    );
  if (ptMatch) {
    const d = Number(ptMatch[1]);
    const monthStr = PORTUGUESE_MONTHS[ptMatch[2].slice(0, 3).toLowerCase()];
    const y = ptMatch[3] ? Number(ptMatch[3]) : fallbackYear;
    if (monthStr && isValidCalendarDate(y, Number(monthStr), d)) {
      return `${String(y).padStart(4, "0")}-${monthStr}-${String(d).padStart(2, "0")}`;
    }
  }

  return null;
}

export function buildExtractDocumentPrompt(todayIso: string): string {
  return `Você é um extrator especialista em documentos acadêmicos universitários brasileiros (comprovante de matrícula, grade horária, calendário acadêmico ou print de portais como Blackboard, Canvas, Moodle, Google Classroom e Área do Aluno).
Data atual de referência: ${todayIso}.

Analise o arquivo enviado (PDF ou imagem) e extraia TODAS as disciplinas e TODAS as atividades, entregas, provas ou avaliações com prazos legíveis.

Responda APENAS com um JSON estrito no formato exato:
{
  "subjects": [
    { "nome": "Nome da Disciplina", "codigo": "CODIGO_OU_VAZIO", "professor": "Nome do Professor ou vazio" }
  ],
  "tasks": [
    { "titulo": "Título da Atividade ou Prova", "subjectNome": "Nome da Disciplina", "data_entrega": "YYYY-MM-DD ou null", "descricao": "Descrição curta ou vazio" }
  ]
}

Regras obrigatórias:
- Extraia apenas disciplinas reais e atividades/entregas/provas reais visíveis no arquivo. Nunca invente itens.
- Se for um comprovante de matrícula ou grade de disciplinas sem prazos, retorne as disciplinas em "subjects" e "tasks": [].
- Se for um calendário ou lista de atividades, preencha "tasks" e inclua as disciplinas correspondentes em "subjects".
- Formate "data_entrega" como "YYYY-MM-DD". Quando houver apenas dia/mês, infira o ano com base na data de referência (${todayIso}). Se não houver data, use null.
- Para campos opcionais ausentes ("codigo", "professor", "descricao", "subjectNome"), use string vazia "".
- Ignore menus, botões, rodapés, boletos, dados financeiros ou texto irrelevante.
- Se o arquivo NÃO contiver dados acadêmicos legíveis (por exemplo: imagem borrada, documento não acadêmico ou sem disciplinas/prazos), retorne exatamente {"subjects":[],"tasks":[]}.
- Responda somente o JSON puro, sem markdown ou explicações.`;
}

export function buildExtractDocumentGeminiBody(params: {
  fileBase64: string;
  mimeType: AllowedDocumentMimeType;
  model: string;
  todayIso?: string;
}) {
  const todayIso = params.todayIso ?? new Date().toISOString().slice(0, 10);
  const prompt = buildExtractDocumentPrompt(todayIso);

  return {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.fileBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          subjects: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                nome: { type: "STRING" },
                codigo: { type: "STRING" },
                professor: { type: "STRING" },
              },
              required: ["nome", "codigo", "professor"],
            },
          },
          tasks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                titulo: { type: "STRING" },
                subjectNome: { type: "STRING" },
                data_entrega: { type: "STRING", nullable: true },
                descricao: { type: "STRING" },
              },
              required: ["titulo", "subjectNome", "data_entrega", "descricao"],
            },
          },
        },
        required: ["subjects", "tasks"],
      },
      ...(params.model.startsWith("gemini-2.5")
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
    },
  };
}

export function parseExtractDocumentResponse(
  rawText: string,
  fallbackYear = new Date().getFullYear()
): DocumentParseResult {
  const cleaned = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (!cleaned) {
    return {
      ok: false,
      reason: "invalid_json",
      error: UNREADABLE_DOCUMENT_ERROR,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(cleaned);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return {
        ok: false,
        reason: "invalid_json",
        error: UNREADABLE_DOCUMENT_ERROR,
      };
    }
    parsed = candidate as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      error: UNREADABLE_DOCUMENT_ERROR,
    };
  }

  const subjectMap = new Map<string, ExtractedDocumentSubject>();
  const rawSubjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];

  for (const item of rawSubjects) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const nome = String(rec.nome ?? rec.name ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    if (nome.length < 2) continue;

    const codigo = String(rec.codigo ?? rec.code ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 32);
    const professor = String(rec.professor ?? rec.docente ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    const key = normalizeKey(nome);
    if (!key) continue;

    const existing = subjectMap.get(key);
    if (existing) {
      if (codigo && !existing.codigo) existing.codigo = codigo;
      if (professor && !existing.professor) existing.professor = professor;
    } else {
      subjectMap.set(key, { nome, codigo, professor });
    }
  }

  const tasks: ExtractedDocumentTask[] = [];
  const seenTasks = new Set<string>();
  const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

  for (const item of rawTasks) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const titulo = String(rec.titulo ?? rec.title ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
    if (titulo.length < 2) continue;

    const subjectNomeRaw = String(
      rec.subjectNome ?? rec.courseName ?? rec.subjectName ?? rec.disciplina ?? ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    let canonicalSubjectName = subjectNomeRaw;
    if (subjectNomeRaw) {
      const subKey = normalizeKey(subjectNomeRaw);
      if (subKey) {
        const existingSub = subjectMap.get(subKey);
        if (existingSub) {
          canonicalSubjectName = existingSub.nome;
        } else {
          subjectMap.set(subKey, {
            nome: subjectNomeRaw,
            codigo: "",
            professor: "",
          });
        }
      }
    }

    const data_entrega = normalizeDocumentDate(
      rec.data_entrega ?? rec.dueDate ?? rec.prazo ?? null,
      fallbackYear
    );
    const descricao = String(rec.descricao ?? rec.description ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);

    const dedupeKey = `${normalizeKey(titulo)}|${normalizeKey(canonicalSubjectName)}|${data_entrega ?? ""}`;
    if (seenTasks.has(dedupeKey)) continue;
    seenTasks.add(dedupeKey);

    tasks.push({
      titulo,
      subjectNome: canonicalSubjectName,
      data_entrega,
      descricao,
    });
  }

  const subjects = [...subjectMap.values()];

  if (subjects.length === 0 && tasks.length === 0) {
    return {
      ok: false,
      reason: "no_academic_data",
      error: UNREADABLE_DOCUMENT_ERROR,
    };
  }

  return {
    ok: true,
    data: {
      subjects,
      tasks,
    },
  };
}
