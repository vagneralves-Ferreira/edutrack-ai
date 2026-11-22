import { describe, expect, it } from 'vitest';
import { resolveUserInstitution } from '../AuthContext';
import { formatHeaderInstitutionLabel } from '../../components/layout/Header';

describe('White-label / Multi-instituição', () => {
  it('retorna a instituição informada pelo usuário (trimada) para qualquer faculdade', () => {
    expect(resolveUserInstitution('  UNICID  ')).toBe('UNICID');
    expect(resolveUserInstitution('Faculdade Impacta')).toBe('Faculdade Impacta');
    expect(resolveUserInstitution('FIAP')).toBe('FIAP');
  });

  it('retorna undefined quando nenhuma instituição foi informada (sem fallback fixo)', () => {
    expect(resolveUserInstitution(undefined)).toBeUndefined();
    expect(resolveUserInstitution(null)).toBeUndefined();
    expect(resolveUserInstitution('')).toBeUndefined();
    expect(resolveUserInstitution('   ')).toBeUndefined();
  });

  it('exibe rótulo neutro no Header antes do login e instituição dinâmica após login', () => {
    expect(formatHeaderInstitutionLabel(false, 'Faculdade Impacta', '2026.2')).toBe('Planner Acadêmico');
    expect(formatHeaderInstitutionLabel(false, undefined, undefined)).toBe('Planner Acadêmico');
    expect(formatHeaderInstitutionLabel(true, 'UNICID', '2026.2')).toBe('UNICID • 2026.2');
    expect(formatHeaderInstitutionLabel(true, 'USP', 'Mestrado (Stricto Sensu)')).toBe('USP • Mestrado (Stricto Sensu)');
    expect(formatHeaderInstitutionLabel(true, undefined, '12º Semestre')).toBe('Planner Acadêmico • 12º Semestre');
    expect(formatHeaderInstitutionLabel(true, undefined, '2026.2')).toBe('Planner Acadêmico • 2026.2');
  });
});
