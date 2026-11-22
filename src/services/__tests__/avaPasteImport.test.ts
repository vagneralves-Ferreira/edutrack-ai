import { describe, expect, it } from 'vitest';
import { parseClassroomPastedContent } from '../classroomSync';

describe('parseClassroomPastedContent - Blackboard / Área do Aluno', () => {
  it('extrai disciplinas da página de cursos do Blackboard (UNICID / Cruzeiro do Sul) sem precisar de atividades', () => {
    const rawBlackboardCourses = `
      Blackboard Learn
      Cursos atuais
      20262_GRAD_BIO_101
      Anatomia Humana
      Aberto
      20262_GRAD_BIO_102 - Bioquímica Metabólica
      Aberto
      Disciplina: Microbiologia Clínica
    `;

    const result = parseClassroomPastedContent(rawBlackboardCourses, []);
    const names = result.subjects.map((s) => s.name);

    expect(names).toContain('Anatomia Humana');
    expect(names).toContain('Bioquímica Metabólica');
    expect(names).toContain('Microbiologia Clínica');
    expect(result.stats.coursesCount).toBe(3);
  });

  it('extrai disciplinas e datas de entrega do calendário do Blackboard / Área do Aluno', () => {
    const rawBlackboardCalendar = `
      Área do Aluno
      Calendário
      20262_GRAD_BIO_101 - Anatomia Humana
      Vence em: 25/11/2026 23:59
      Atividade Sistematizada 1 (AS1)
      20262_GRAD_BIO_102 - Bioquímica Metabólica
      Avaliação Parcial A1 - Prazo: 30/11/2026
    `;

    const result = parseClassroomPastedContent(rawBlackboardCalendar, []);

    expect(result.subjects.map((s) => s.name)).toEqual([
      'Anatomia Humana',
      'Bioquímica Metabólica',
    ]);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].title).toBe('Atividade Sistematizada 1 (AS1)');
    expect(result.tasks[0].subjectName).toBe('Anatomia Humana');
    expect(result.tasks[0].dueDate).toBe('2026-11-25');

    expect(result.tasks[1].title).toBe('Avaliação Parcial A1');
    expect(result.tasks[1].subjectName).toBe('Bioquímica Metabólica');
    expect(result.tasks[1].dueDate).toBe('2026-11-30');
  });
});
