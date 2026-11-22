import { describe, expect, it } from 'vitest';
import {
  buildExtensionTaskWritePlan,
  detectPortalFromContext,
  parseAcademicPortalText,
  planExtensionSubjectSync,
  sanitizeExtractedFrames,
} from '../academicParser';
import { normalizeText } from '../classroomImport';

describe('detectPortalFromContext', () => {
  it('bloqueia páginas internas e lojas do navegador com orientação clara', () => {
    expect(detectPortalFromContext('chrome://extensions').isSupportedPage).toBe(false);
    expect(detectPortalFromContext('edge://settings').isSupportedPage).toBe(false);
    expect(detectPortalFromContext('https://chromewebstore.google.com/detail/xyz').isSupportedPage).toBe(false);
    expect(detectPortalFromContext('https://microsoftedge.microsoft.com/addons').isSupportedPage).toBe(false);
  });

  it('identifica corretamente os principais portais universitários', () => {
    expect(detectPortalFromContext('https://bb.cruzeirodosulvirtual.com.br/ultra/course').label).toContain('UNICID');
    expect(detectPortalFromContext('https://novoportal.cruzeirodosul.edu.br/home').id).toBe('unicid_cruzeiro');
    expect(detectPortalFromContext('https://ava.faculdade.edu.br/webapps/portal/execute').id).toBe('blackboard');
    expect(detectPortalFromContext('https://instituicao.instructure.com/courses').id).toBe('canvas');
    expect(detectPortalFromContext('https://moodle.usp.br/my/courses.php').id).toBe('moodle');
    expect(detectPortalFromContext('https://classroom.google.com/u/0/h').id).toBe('google_classroom');
    expect(detectPortalFromContext('https://portal.minhafaculdade.edu.br/aluno').label).toBe('Portal Acadêmico');
  });
});

describe('sanitizeExtractedFrames', () => {
  it('une frame principal e iframes removendo ruído, duplicatas e código', () => {
    const sanitized = sanitizeExtractedFrames([
      {
        isMainFrame: false,
        url: 'https://bb.cruzeirodosulvirtual.com.br/ultra/stream',
        cardBlocks: [
          '20262_GRAD_BIO_101 - Anatomia Humana\nVence em: 28/11/2026 23:59\nAtividade Sistematizada 2',
          '20262_GRAD_BIO_101 - Anatomia Humana\nVence em: 28/11/2026 23:59\nAtividade Sistematizada 2',
        ],
        lines: ['Blackboard Learn', 'Menu principal', 'const debug = 1;', 'Sair'],
      },
      {
        isMainFrame: true,
        url: 'https://novoportal.cruzeirodosul.edu.br/',
        lines: ['Área do Aluno', 'Disciplina: Bioquímica Clínica', 'Professor: Dra. Helena Souza'],
      },
    ]);

    expect(sanitized).toContain('Disciplina: Bioquímica Clínica');
    expect(sanitized).toContain('Professor: Dra. Helena Souza');
    expect(sanitized).toContain('20262_GRAD_BIO_101 - Anatomia Humana');
    expect(sanitized).toContain('Atividade Sistematizada 2');
    expect(sanitized).not.toContain('Menu principal');
    expect(sanitized).not.toContain('const debug = 1;');
    // Duplicata exata do bloco de card não deve aparecer duas vezes
    expect(sanitized.split('Atividade Sistematizada 2').length - 1).toBe(1);
  });
});

describe('parseAcademicPortalText', () => {
  it('extrai disciplinas, professores e datas de entrega de texto Blackboard/UNICID', () => {
    const text = `
      20262_GRAD_BIO_101
      Anatomia Humana
      Professor: Dr. Carlos Mendes
      Vence em: 29/11/2026 23:59
      Relatório Prático de Osteologia
      20262_GRAD_BIO_102 - Bioquímica Metabólica
      Prova Parcial A1 - Prazo: 05 de dez. de 2026
    `;

    const parsed = parseAcademicPortalText(text);
    expect(parsed.subjects).toHaveLength(2);
    expect(parsed.subjects[0]).toMatchObject({
      name: 'Anatomia Humana',
      code: '20262_GRAD_BIO_101',
      professor: 'Dr. Carlos Mendes',
    });
    expect(parsed.subjects[1]).toMatchObject({
      name: 'Bioquímica Metabólica',
      code: '20262_GRAD_BIO_102',
    });

    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0]).toMatchObject({
      title: 'Relatório Prático de Osteologia',
      courseName: 'Anatomia Humana',
      dueDate: '2026-11-29',
    });
    expect(parsed.tasks[1]).toMatchObject({
      title: 'Prova Parcial A1',
      courseName: 'Bioquímica Metabólica',
      dueDate: '2026-12-05',
    });
  });
});

describe('planExtensionSubjectSync & buildExtensionTaskWritePlan (deduplicação idempotente)', () => {
  it('não duplica disciplinas existentes ignorando acentos, caixa e código, e deduplica tarefas já gravadas', () => {
    const selectedSubjects = [
      { tempId: 'sub:1', name: 'Bioquímica Metabólica', code: 'BIO-102', professor: 'Profa. Ana' },
      { tempId: 'sub:2', name: 'ANATOMIA HUMANA', code: '20262_BIO_101' },
      { tempId: 'sub:3', name: 'Microbiologia Clínica', code: 'MIC-201' },
    ];

    const selectedTasks = [
      {
        tempId: 't1',
        title: 'Atividade Sistematizada 1',
        courseName: 'Bioquímica Metabólica',
        dueDate: '2026-11-28',
        turnedIn: false,
        priority: 'alta' as const,
        type: 'projeto' as const,
      },
      {
        tempId: 't2',
        title: 'Seminário de Bacteriologia',
        courseName: 'Microbiologia Clínica',
        dueDate: '2026-12-03',
        turnedIn: false,
        priority: 'media' as const,
        type: 'exercicio' as const,
      },
    ];

    const existingSubjects = [
      { id: 'uuid-bioq', nome: 'bioquimica metabolica', codigo: 'BIOQ-OLD' },
      { id: 'uuid-anat', nome: 'Anatomia Aplicada', codigo: '20262_BIO_101' },
    ];

    const plan = planExtensionSubjectSync('user-1', selectedSubjects, selectedTasks, existingSubjects);

    // Bioquímica bateu por nome sem acento; Anatomia bateu por código; só Microbiologia deve ser criada
    expect(plan.matchedSubjects).toHaveLength(2);
    expect(plan.subjectsToCreate).toHaveLength(1);
    expect(plan.subjectsToCreate[0]).toMatchObject({
      user_id: 'user-1',
      nome: 'Microbiologia Clínica',
      codigo: 'MIC-201',
      carga_horaria_total: 80,
    });

    const subjectUuidByNormName = new Map<string, string>([
      [normalizeText('Bioquímica Metabólica'), 'uuid-bioq'],
      [normalizeText('Anatomia Humana'), 'uuid-anat'],
      [normalizeText('Microbiologia Clínica'), 'uuid-micro'],
    ]);

    const existingTasks = [
      {
        id: 'task-uuid-existing',
        classroom_id: 'paste:old',
        titulo: 'atividade sistematizada 1',
        subject_id: 'uuid-bioq',
        status: 'in_progress',
        prioridade: 'alta',
        importado_classroom: true,
      },
    ];

    const taskPlan = buildExtensionTaskWritePlan(
      'user-1',
      selectedTasks,
      subjectUuidByNormName,
      'uuid-bioq',
      existingTasks,
      '2026-11-22'
    );

    // Atividade 1 adota a linha existente (preservando status in_progress); Seminário é inserido como novo
    expect(taskPlan.updates).toHaveLength(1);
    expect(taskPlan.updates[0]).toMatchObject({
      id: 'task-uuid-existing',
      status: 'in_progress',
      subject_id: 'uuid-bioq',
    });
    expect(taskPlan.inserts).toHaveLength(1);
    expect(taskPlan.inserts[0]).toMatchObject({
      user_id: 'user-1',
      subject_id: 'uuid-micro',
      titulo: 'Seminário de Bacteriologia',
      importado_classroom: true,
    });
  });
});
