import { describe, expect, it } from 'vitest';
import {
  buildSyncResultFromCourseBundles,
  extractAttachments,
  sanitizeExternalUrl,
  type RawCourseBundle,
} from '../classroomSync';

describe('sanitizeExternalUrl', () => {
  it('accepts valid http and https URLs and trims whitespace', () => {
    expect(sanitizeExternalUrl('  https://drive.google.com/file/d/123/view  ')).toBe(
      'https://drive.google.com/file/d/123/view'
    );
    expect(sanitizeExternalUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('rejects empty, non-string, malformed, and unsafe URLs', () => {
    expect(sanitizeExternalUrl('')).toBeUndefined();
    expect(sanitizeExternalUrl('   ')).toBeUndefined();
    expect(sanitizeExternalUrl(null)).toBeUndefined();
    expect(sanitizeExternalUrl(undefined)).toBeUndefined();
    expect(sanitizeExternalUrl('not-a-url')).toBeUndefined();
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });
});

describe('extractAttachments', () => {
  it('extracts driveFile with alternateLink and driveFileId', () => {
    const result = extractAttachments([
      {
        driveFile: {
          driveFile: {
            id: 'abc123',
            title: 'Lista de SQL.pdf',
            alternateLink: 'https://drive.google.com/file/d/abc123/view?usp=drive_web',
          },
        },
      },
    ]);

    expect(result.fileAttachments).toHaveLength(1);
    expect(result.fileAttachments[0]).toEqual({
      title: 'Lista de SQL.pdf',
      url: 'https://drive.google.com/file/d/abc123/view?usp=drive_web',
      alternateLink: 'https://drive.google.com/file/d/abc123/view?usp=drive_web',
      driveFileId: 'abc123',
      type: 'drive',
    });
    expect(result.format).toBe('Google Drive / PDF');
  });

  it('builds Google Drive fallback URL when alternateLink is missing but id is present', () => {
    const result = extractAttachments([
      {
        driveFile: {
          driveFile: {
            id: 'file-xyz',
            title: 'Apostila',
          },
        },
      },
    ]);

    expect(result.fileAttachments).toHaveLength(1);
    expect(result.fileAttachments[0].url).toBe('https://drive.google.com/file/d/file-xyz/view');
    expect(result.fileAttachments[0].driveFileId).toBe('file-xyz');
  });

  it('extracts youtubeVideo, link, and form attachments and ignores invalid URLs', () => {
    const result = extractAttachments(
      [
        { youtubeVideo: { title: 'Aula 01', alternateLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
        { link: { title: 'Documentação', url: 'https://postgresql.org/docs/' } },
        { form: { title: 'Quiz', formUrl: 'https://docs.google.com/forms/d/e/123/viewform' } },
        { link: { title: 'Unsafe', url: 'javascript:void(0)' } },
        { driveFile: { driveFile: { title: 'Sem URL' } } },
        null,
      ],
      'https://classroom.google.com/c/1/a/2/details'
    );

    expect(result.fileAttachments.map((a) => a.type)).toEqual(['youtube', 'link', 'form']);
    expect(result.attachments).toHaveLength(4);
    expect(result.attachments[3].type).toBe('classroom');
  });

  it('prevents duplicate attachments with the same URL (case-insensitive)', () => {
    const result = extractAttachments(
      [
        { link: { title: 'Link 1', url: 'https://example.com/doc.pdf' } },
        { link: { title: 'Link 1 duplicado', url: 'HTTPS://EXAMPLE.COM/doc.pdf' } },
      ],
      'https://example.com/doc.pdf'
    );

    expect(result.fileAttachments).toHaveLength(1);
    expect(result.attachments).toHaveLength(1);
  });
});

describe('buildSyncResultFromCourseBundles', () => {
  it('consolidates courseWork attachments into tasks, evaluations, and subject materials', () => {
    const bundles: RawCourseBundle[] = [
      {
        course: { id: '101', name: 'SQL Fundamentals', section: '2026.2' },
        teachers: [{ profile: { name: { fullName: 'Prof. Carlos' } } }],
        topics: [],
        courseWork: [
          {
            id: 'cw-1',
            title: 'Lista de questões para preparação para a Prova',
            description: 'Resolva os exercícios anexos.',
            maxPoints: 10,
            alternateLink: 'https://classroom.google.com/c/101/a/cw-1/details',
            materials: [
              {
                driveFile: {
                  driveFile: {
                    id: 'drv-999',
                    title: 'Lista_SQL_Prova.pdf',
                    alternateLink: 'https://drive.google.com/file/d/drv-999/view',
                  },
                },
              },
            ],
          },
          {
            id: 'cw-2',
            title: 'Atividade sem anexo',
            description: 'Apenas texto.',
            alternateLink: 'https://classroom.google.com/c/101/a/cw-2/details',
          },
        ],
        submissions: [],
        materials: [
          {
            id: 'mat-1',
            title: 'Slides Aula 1',
            alternateLink: 'https://classroom.google.com/c/101/m/mat-1/details',
            materials: [{ link: { title: 'Slides PDF', url: 'https://example.com/slides.pdf' } }],
          },
        ],
        announcements: [
          {
            id: 'ann-1',
            text: 'Aviso importante da prova',
            alternateLink: 'https://classroom.google.com/c/101/p/ann-1',
            materials: [{ driveFile: { driveFile: { id: 'drv-ann', title: 'Edital.pdf' } } }],
          },
        ],
      },
    ];

    const result = buildSyncResultFromCourseBundles(bundles, 'google_api');

    expect(result.subjects).toHaveLength(1);
    const subject = result.subjects[0];

    // Task has attachments
    const taskWithAttachment = result.tasks.find((t) => t.classroomId === 'gc:101:cw-1');
    expect(taskWithAttachment?.attachments).toHaveLength(2);
    expect(taskWithAttachment?.attachments?.[0].driveFileId).toBe('drv-999');

    // Evaluation has attachments
    expect(subject.evaluations).toHaveLength(1);
    expect(subject.evaluations[0].attachments?.[0].title).toBe('Lista_SQL_Prova.pdf');

    // Subject materials include courseWork with fileAttachments + courseWorkMaterials + announcements (not cw-2)
    expect(subject.materials?.map((m) => m.id)).toEqual(['cw-101-cw-1', 'mat-101-mat-1', 'ann-101-ann-1']);
    expect(subject.materials?.[0].badge).toBe('Atividade Classroom');
    expect(subject.materials?.[2].attachments?.[0].url).toBe('https://drive.google.com/file/d/drv-ann/view');
  });

  it('handles missing or malformed bundle arrays defensively without throwing', () => {
    const bundles: RawCourseBundle[] = [
      {
        course: { id: '202', name: 'Banco de Dados' },
        teachers: [],
        topics: [],
        courseWork: undefined as any,
        submissions: null as any,
        materials: undefined as any,
        announcements: undefined as any,
      },
    ];

    const result = buildSyncResultFromCourseBundles(bundles, 'google_api');
    expect(result.subjects).toHaveLength(1);
    expect(result.tasks).toHaveLength(0);
    expect(result.subjects[0].materials).toEqual([]);
  });
});
