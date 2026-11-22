import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  buildExtractDocumentGeminiBody,
  estimateBase64ByteSize,
  normalizeDocumentDate,
  parseExtractDocumentResponse,
  validateDocumentRequest,
} from '../../../supabase/functions/ai-dicas/extractDocument.ts';
import {
  buildDocumentSyncPayload,
  buildDocumentTaskKey,
  getOfficialExtensionStoreUrl,
  parseExtractedDocumentPayload,
  validateDocumentFile,
} from '../documentImport';
import { planClassroomTaskWrites } from '../classroomImport';

function makeBase64OfByteLength(byteLength: number): string {
  const fullTriplets = Math.floor(byteLength / 3);
  const remainder = byteLength % 3;
  let result = 'AAAA'.repeat(fullTriplets);
  if (remainder === 1) result += 'AA==';
  else if (remainder === 2) result += 'AAA=';
  return result;
}

describe('Backend extract_document — validateDocumentRequest', () => {
  it('aceita PDF, PNG, JPEG e WEBP válidos (incluindo prefixo data URL)', () => {
    const sampleBase64 = btoa('%PDF-1.4 mock schedule');

    for (const mimeType of ALLOWED_DOCUMENT_MIME_TYPES) {
      const res = validateDocumentRequest({ fileBase64: sampleBase64, mimeType });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.mimeType).toBe(mimeType);
        expect(res.fileBase64).toBe(sampleBase64);
        expect(res.byteSize).toBeGreaterThan(0);
      }
    }

    const withDataPrefix = validateDocumentRequest({
      fileBase64: `data:image/png;base64,${sampleBase64}\n`,
      mimeType: 'IMAGE/PNG',
    });
    expect(withDataPrefix.ok).toBe(true);
    if (withDataPrefix.ok) {
      expect(withDataPrefix.mimeType).toBe('image/png');
      expect(withDataPrefix.fileBase64).toBe(sampleBase64);
    }
  });

  it('rejeita formatos não suportados (ZIP, TXT, GIF, vazio) com erro em português', () => {
    const sampleBase64 = btoa('conteudo');

    for (const badMime of ['application/zip', 'text/plain', 'image/gif', '']) {
      const res = validateDocumentRequest({ fileBase64: sampleBase64, mimeType: badMime });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(400);
        expect(res.error).toMatch(/formato.*não suportado/i);
      }
    }
  });

  it('rejeita base64 vazio ou corrompido com status 400', () => {
    const emptyRes = validateDocumentRequest({ fileBase64: '   ', mimeType: 'application/pdf' });
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) expect(emptyRes.status).toBe(400);

    const invalidRes = validateDocumentRequest({ fileBase64: '@@@not-base64!!!', mimeType: 'image/jpeg' });
    expect(invalidRes.ok).toBe(false);
    if (!invalidRes.ok) expect(invalidRes.status).toBe(400);
  });

  it('valida estritamente o teto de 5 MB (aceita exatamente 5 MB e rejeita 5 MB + 1 byte)', () => {
    const exactLimitBase64 = makeBase64OfByteLength(MAX_DOCUMENT_BYTES);
    expect(estimateBase64ByteSize(exactLimitBase64)).toBe(MAX_DOCUMENT_BYTES);
    const exactRes = validateDocumentRequest({
      fileBase64: exactLimitBase64,
      mimeType: 'application/pdf',
    });
    expect(exactRes.ok).toBe(true);

    const overLimitBase64 = makeBase64OfByteLength(MAX_DOCUMENT_BYTES + 1);
    expect(estimateBase64ByteSize(overLimitBase64)).toBe(MAX_DOCUMENT_BYTES + 1);
    const overRes = validateDocumentRequest({
      fileBase64: overLimitBase64,
      mimeType: 'application/pdf',
    });
    expect(overRes.ok).toBe(false);
    if (!overRes.ok) {
      expect(overRes.status).toBe(413);
      expect(overRes.error).toContain('5 MB');
    }
  });
});

describe('Backend extract_document — Gemini inlineData & parseExtractDocumentResponse', () => {
  it('monta payload Gemini com inlineData e JSON schema estrito', () => {
    const body = buildExtractDocumentGeminiBody({
      fileBase64: 'JVBERi0xLjQ=',
      mimeType: 'application/pdf',
      model: 'gemini-2.5-flash',
      todayIso: '2026-11-22',
    });

    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: {
        mimeType: 'application/pdf',
        data: 'JVBERi0xLjQ=',
      },
    });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.required).toEqual(['subjects', 'tasks']);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('normaliza datas em ISO, DD/MM/YYYY e português com validação de calendário', () => {
    expect(normalizeDocumentDate('2026-11-28')).toBe('2026-11-28');
    expect(normalizeDocumentDate('28/11/2026')).toBe('2026-11-28');
    expect(normalizeDocumentDate('05 de dez. de 2026')).toBe('2026-12-05');
    expect(normalizeDocumentDate('15/03', 2026)).toBe('2026-03-15');
    expect(normalizeDocumentDate('31/02/2026')).toBeNull();
    expect(normalizeDocumentDate(null)).toBeNull();
    expect(normalizeDocumentDate('Sem data')).toBeNull();
  });

  it('faz parsing estrito de JSON (inclusive com cercas markdown), deduplica e completa disciplinas referenciadas', () => {
    const rawGeminiText = `\`\`\`json
    {
      "subjects": [
        { "nome": "Anatomia Humana", "codigo": "BIO-101", "professor": "Dr. Carlos Mendes" },
        { "nome": "anatomia humana", "codigo": "", "professor": "" },
        { "nome": "Bioquímica Clínica", "codigo": "BIO-202", "professor": "" }
      ],
      "tasks": [
        {
          "titulo": "Prova Parcial A1",
          "subjectNome": "Anatomia Humana",
          "data_entrega": "29/11/2026",
          "descricao": "Conteúdo dos módulos 1 a 3"
        },
        {
          "titulo": "Prova Parcial A1",
          "subjectNome": "anatomia humana",
          "data_entrega": "2026-11-29",
          "descricao": "Duplicada"
        },
        {
          "titulo": "Seminário de Microbiologia",
          "subjectNome": "Microbiologia Aplicada",
          "data_entrega": null,
          "descricao": "Apresentação em grupo"
        }
      ]
    }
    \`\`\``;

    const parsed = parseExtractDocumentResponse(rawGeminiText, 2026);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.subjects).toHaveLength(3);
    expect(parsed.data.subjects[0]).toEqual({
      nome: 'Anatomia Humana',
      codigo: 'BIO-101',
      professor: 'Dr. Carlos Mendes',
    });
    expect(parsed.data.subjects[2]).toEqual({
      nome: 'Microbiologia Aplicada',
      codigo: '',
      professor: '',
    });

    expect(parsed.data.tasks).toHaveLength(2);
    expect(parsed.data.tasks[0]).toEqual({
      titulo: 'Prova Parcial A1',
      subjectNome: 'Anatomia Humana',
      data_entrega: '2026-11-29',
      descricao: 'Conteúdo dos módulos 1 a 3',
    });
    expect(parsed.data.tasks[1]).toEqual({
      titulo: 'Seminário de Microbiologia',
      subjectNome: 'Microbiologia Aplicada',
      data_entrega: null,
      descricao: 'Apresentação em grupo',
    });
  });

  it('retorna erro amigável em português quando o arquivo não contém dados acadêmicos legíveis', () => {
    const emptyAcademic = parseExtractDocumentResponse('{"subjects":[],"tasks":[]}');
    expect(emptyAcademic.ok).toBe(false);
    if (!emptyAcademic.ok) {
      expect(emptyAcademic.reason).toBe('no_academic_data');
      expect(emptyAcademic.error).toMatch(/não encontramos disciplinas ou prazos acadêmicos legíveis/i);
    }

    const brokenJson = parseExtractDocumentResponse('não é json válido');
    expect(brokenJson.ok).toBe(false);
    if (!brokenJson.ok) {
      expect(brokenJson.reason).toBe('invalid_json');
      expect(brokenJson.error).toMatch(/não encontramos disciplinas ou prazos acadêmicos legíveis/i);
    }
  });
});

describe('Frontend documentImport — validação, prévia, deduplicação idempotente e link oficial da extensão', () => {
  it('valida arquivos no frontend por MIME type, extensão de fallback e tamanho máximo de 5 MB', () => {
    expect(validateDocumentFile({ name: 'matricula.pdf', type: 'application/pdf', size: 120_000 })).toEqual({
      ok: true,
      mimeType: 'application/pdf',
    });

    // Fallback de extensão quando o SO não envia MIME type
    expect(validateDocumentFile({ name: 'print-portal.webp', type: '', size: 45_000 })).toEqual({
      ok: true,
      mimeType: 'image/webp',
    });

    const zipReject = validateDocumentFile({ name: 'extensao.zip', type: 'application/zip', size: 10_000 });
    expect(zipReject.ok).toBe(false);

    const zeroReject = validateDocumentFile({ name: 'vazio.png', type: 'image/png', size: 0 });
    expect(zeroReject.ok).toBe(false);

    const bigReject = validateDocumentFile({
      name: 'grande.jpg',
      type: 'image/jpeg',
      size: 5 * 1024 * 1024 + 100,
    });
    expect(bigReject.ok).toBe(false);
    if (!bigReject.ok) expect(bigReject.error).toContain('5 MB');
  });

  it('faz prévia com correspondência de disciplinas existentes e gera plano idempotente para o Supabase', () => {
    const existingSubjects = [
      { id: 'uuid-anat', name: 'Anatomia Humana', code: 'BIO-101' },
    ];

    const preview = parseExtractedDocumentPayload(
      {
        subjects: [
          { nome: 'anatomia humana', codigo: 'BIO-101', professor: 'Dr. Carlos' },
          { nome: 'Bioquímica Clínica', codigo: 'BIO-202', professor: 'Dra. Helena' },
        ],
        tasks: [
          {
            titulo: 'Avaliação Parcial 1',
            subjectNome: 'Anatomia Humana',
            data_entrega: '2026-11-30',
            descricao: 'Prova presencial',
          },
          {
            titulo: 'Relatório de Laboratório',
            subjectNome: 'Bioquímica Clínica',
            data_entrega: null,
            descricao: '',
          },
        ],
      },
      existingSubjects,
      'comprovante-matricula.pdf'
    );

    expect(preview.subjects).toHaveLength(2);
    expect(preview.subjects[0].matchedExistingSubjectId).toBe('uuid-anat');
    expect(preview.subjects[1].matchedExistingSubjectId).toBeUndefined();

    // Seleciona tudo na prévia
    const { result, resolutions } = buildDocumentSyncPayload(
      preview,
      new Set(preview.subjects.map((s) => s.id)),
      new Set(preview.tasks.map((t) => t.id)),
      existingSubjects
    );

    expect(result.subjects).toHaveLength(2);
    expect(result.tasks).toHaveLength(2);
    expect(resolutions['doc-course:anatomia humana']).toEqual({ action: 'link', subjectId: 'uuid-anat' });
    expect(resolutions['doc-course:bioquimica clinica']).toEqual({ action: 'create' });

    // Reimportar o mesmo arquivo gera exatamente as mesmas chaves classroomId (mesmo sem data_entrega)
    const key1 = buildDocumentTaskKey('Relatório de Laboratório', 'Bioquímica Clínica', null);
    const key2 = buildDocumentTaskKey('relatorio de laboratorio', 'bioquimica clinica', null);
    expect(key1).toBe(key2);
    expect(key1.startsWith('doc:')).toBe(true);

    // Verifica que planClassroomTaskWrites atualiza em vez de duplicar quando já existe no banco
    const plan = planClassroomTaskWrites(
      'user-1',
      [
        {
          classroomId: result.tasks[0].classroomId,
          title: result.tasks[0].title,
          description: result.tasks[0].description,
          dueDate: result.tasks[0].dueDate,
          priority: result.tasks[0].priority,
          turnedIn: false,
          subjectUuid: 'uuid-anat',
        },
      ],
      [
        {
          id: 'existing-task-uuid',
          classroom_id: result.tasks[0].classroomId,
          titulo: 'Avaliação Parcial 1',
          subject_id: 'uuid-anat',
          status: 'in_progress',
          prioridade: 'alta',
          importado_classroom: true,
        },
      ]
    );

    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]).toMatchObject({
      id: 'existing-task-uuid',
      status: 'in_progress',
    });
  });

  it('exibe link da extensão SOMENTE quando VITE_EXTENSION_STORE_URL for um link oficial de loja (nunca .zip)', () => {
    expect(getOfficialExtensionStoreUrl('')).toBeNull();
    expect(getOfficialExtensionStoreUrl('   ')).toBeNull();
    expect(getOfficialExtensionStoreUrl('https://meusite.com/edutrack-extension.zip')).toBeNull();
    expect(
      getOfficialExtensionStoreUrl('https://chromewebstore.google.com/detail/edutrack.zip')
    ).toBeNull();
    expect(getOfficialExtensionStoreUrl('http://chromewebstore.google.com/detail/edutrack/abc')).toBeNull();
    expect(getOfficialExtensionStoreUrl('https://example.com/extensao')).toBeNull();

    expect(
      getOfficialExtensionStoreUrl('https://chromewebstore.google.com/detail/edutrack-ai/abcdefghij')
    ).toBe('https://chromewebstore.google.com/detail/edutrack-ai/abcdefghij');

    expect(
      getOfficialExtensionStoreUrl(
        'https://microsoftedge.microsoft.com/addons/detail/edutrack-ai/abcdefghij'
      )
    ).toBe('https://microsoftedge.microsoft.com/addons/detail/edutrack-ai/abcdefghij');
  });
});
