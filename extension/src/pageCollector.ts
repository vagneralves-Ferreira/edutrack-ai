import type { ExtractedFrameInput } from '../../src/services/academicParser';

/**
 * Função injetada diretamente via chrome.scripting.executeScript({ target: { tabId, allFrames: true } }).
 * IMPORTANTE: precisa ser 100% autossuficiente (sem referências a variáveis de escopo externo),
 * pois o navegador serializa o corpo da função e a executa isoladamente em cada frame da aba.
 */
export function collectAcademicFrame(): ExtractedFrameInput {
  const IGNORED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'SVG',
    'PATH',
    'IFRAME',
    'CANVAS',
    'VIDEO',
    'AUDIO',
    'NAV',
    'FOOTER',
    'HEADER',
    'ASIDE',
  ]);

  const CARD_SELECTOR = [
    'article',
    '[role="listitem"]',
    '[role="row"]',
    'tr',
    '[class*="course"]',
    '[class*="disciplina"]',
    '[class*="card"]',
    '[class*="activity"]',
    '[class*="assignment"]',
    '[class*="calendar"]',
    '[class*="stream"]',
    '[data-course-id]',
  ].join(',');

  const isVisible = (el: Element): boolean => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if ((el as HTMLElement).hidden) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    } catch {
      // ignora erro de estilo em nós desconectados
    }
    return true;
  };

  const lines: string[] = [];
  const headings: string[] = [];
  const cardBlocks: string[] = [];
  const seenBlocks = new Set<string>();

  const collectTextFromRoot = (root: Document | ShadowRoot | Element, depth: number) => {
    if (depth > 18 || lines.length > 1500) return;

    // Captura blocos estruturados (cards, linhas de tabela, itens de lista) no root atual
    if ('querySelectorAll' in root) {
      try {
        const cards = root.querySelectorAll(CARD_SELECTOR);
        for (let i = 0; i < cards.length && cardBlocks.length < 250; i++) {
          const card = cards[i] as HTMLElement;
          if (!isVisible(card)) continue;
          if (card.closest('nav, footer, aside')) continue;
          const text = (card.innerText || card.textContent || '').trim();
          if (text.length >= 8 && text.length <= 600) {
            const key = text.toLowerCase().replace(/\s+/g, ' ');
            if (!seenBlocks.has(key)) {
              seenBlocks.add(key);
              cardBlocks.push(text);
            }
          }
        }
      } catch {
        // ignora seletores não suportados
      }
    }

    const walker = (root as Document).ownerDocument
      ? (root as Element).ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
      : document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

    let current: Node | null = walker.nextNode();
    while (current && lines.length < 1500) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as HTMLElement;
        if (IGNORED_TAGS.has(el.tagName) || !isVisible(el)) {
          // Pula subárvore de elementos ignorados ou ocultos
          let next: Node | null = el.nextSibling;
          let parent: Node | null = el.parentNode;
          while (!next && parent && parent !== root) {
            next = parent.nextSibling;
            parent = parent.parentNode;
          }
          if (!next) break;
          walker.currentNode = next;
          current = next;
          continue;
        }

        if (/^H[1-4]$/.test(el.tagName)) {
          const hText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
          if (hText.length >= 3 && hText.length <= 160) headings.push(hText);
        }

        // Percorre Shadow DOM aberto recursivamente (Blackboard Ultra / Web Components)
        if (el.shadowRoot) {
          collectTextFromRoot(el.shadowRoot, depth + 1);
        }
      } else if (current.nodeType === Node.TEXT_NODE) {
        const parentEl = current.parentElement;
        if (parentEl && !IGNORED_TAGS.has(parentEl.tagName) && isVisible(parentEl)) {
          const text = (current.textContent || '').replace(/\s+/g, ' ').trim();
          if (text.length >= 3 && text.length <= 260) {
            lines.push(text);
          }
        }
      }

      current = walker.nextNode();
    }
  };

  if (document.body) {
    collectTextFromRoot(document.body, 0);
  }

  let isMainFrame = true;
  try {
    isMainFrame = window.self === window.top;
  } catch {
    isMainFrame = false;
  }

  return {
    url: window.location.href,
    title: document.title || '',
    isMainFrame,
    lines,
    headings,
    cardBlocks,
  };
}

/** Executa a coleta em todos os frames acessíveis da aba ativa (main + iframes + Shadow DOM). */
export async function collectActiveTabFrames(tabId: number): Promise<ExtractedFrameInput[]> {
  const results = await chrome.scripting.executeScript<ExtractedFrameInput>({
    target: { tabId, allFrames: true },
    func: collectAcademicFrame,
  });

  return results
    .map((r) => r.result)
    .filter((frame): frame is ExtractedFrameInput => Boolean(frame && (frame.lines?.length || frame.cardBlocks?.length)));
}
