import { describe, expect, it } from 'vitest';
import { BRAZILIAN_INSTITUTIONS, MEC_UNDERGRADUATE_COURSES } from '../academicCatalog';

describe('academicCatalog', () => {
  it('contém instituições brasileiras abrangentes sem duplicatas', () => {
    expect(BRAZILIAN_INSTITUTIONS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(BRAZILIAN_INSTITUTIONS).size).toBe(BRAZILIAN_INSTITUTIONS.length);
    expect(BRAZILIAN_INSTITUTIONS.some((i) => i.includes('UNICID'))).toBe(true);
    expect(BRAZILIAN_INSTITUTIONS).toContain('Universidade Cruzeiro do Sul');
    expect(BRAZILIAN_INSTITUTIONS).toContain('Faculdade Impacta');
    expect(BRAZILIAN_INSTITUTIONS.some((i) => i.includes('USP'))).toBe(true);
  });

  it('contém cursos de graduação do MEC abrangentes sem duplicatas', () => {
    expect(MEC_UNDERGRADUATE_COURSES.length).toBeGreaterThanOrEqual(70);
    expect(new Set(MEC_UNDERGRADUATE_COURSES).size).toBe(MEC_UNDERGRADUATE_COURSES.length);
    expect(MEC_UNDERGRADUATE_COURSES).toContain('Biomedicina');
    expect(MEC_UNDERGRADUATE_COURSES).toContain('Medicina');
    expect(MEC_UNDERGRADUATE_COURSES).toContain('Direito');
    expect(MEC_UNDERGRADUATE_COURSES).toContain('Engenharia de Software');
    expect(MEC_UNDERGRADUATE_COURSES).toContain('Análise e Desenvolvimento de Sistemas');
  });
});
