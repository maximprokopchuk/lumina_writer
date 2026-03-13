import { saveAs } from 'file-saver';
import { Book } from '../types';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  Packer,
  UnderlineType,
  convertMillimetersToTwip,
} from 'docx';

// ---------------------------------------------------------------------------
// Page geometry (shared between PDF and DOCX)
// Поля: левое 30 мм, правое 15 мм, верх 20 мм, низ 20 мм
// ---------------------------------------------------------------------------
const MM = {
  left:   30,
  right:  15,
  top:    20,
  bottom: 20,
};

// ---------------------------------------------------------------------------
// DOCX constants
// ---------------------------------------------------------------------------
const FONT       = 'Times New Roman';
const PT_BODY    = 24; // half-points → 12 pt
const PT_H1      = 32; // 16 pt
const PT_H2      = 28; // 14 pt
const PT_TITLE   = 56; // 28 pt
const PT_AUTHOR  = 36; // 18 pt
// Красная строка 12.5 мм ≈ 709 twips
const FIRST_LINE = convertMillimetersToTwip(12.5);
// Межстрочный интервал 1.15
const LINE_RULE  = 'auto' as const;
const LINE_SPACE = 276; // 240 * 1.15

// ---------------------------------------------------------------------------
// DOCX: inline HTML → TextRun[] (рекурсивный, передаёт стили вниз)
// ---------------------------------------------------------------------------

interface RunStyle { bold?: boolean; italics?: boolean; underline?: boolean }

function parseInline(node: ChildNode, s: RunStyle): TextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text) return [];
    return [new TextRun({
      text,
      font: FONT,
      size: PT_BODY,
      bold:     s.bold     || undefined,
      italics:  s.italics  || undefined,
      underline: s.underline ? { type: UnderlineType.SINGLE } : undefined,
    })];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el  = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return [new TextRun({ break: 1 })];
  const next: RunStyle = {
    bold:      s.bold      || tag === 'strong' || tag === 'b',
    italics:   s.italics   || tag === 'em'     || tag === 'i',
    underline: s.underline || tag === 'u',
  };
  return Array.from(el.childNodes).flatMap(c => parseInline(c, next));
}

// ---------------------------------------------------------------------------
// DOCX: читаем text-align из inline style элемента
// ---------------------------------------------------------------------------

function readAlign(el: HTMLElement, fallback: typeof AlignmentType[keyof typeof AlignmentType]): typeof AlignmentType[keyof typeof AlignmentType] {
  const ta = el.style.textAlign;
  if (ta === 'center')  return AlignmentType.CENTER;
  if (ta === 'right')   return AlignmentType.RIGHT;
  if (ta === 'left')    return AlignmentType.LEFT;
  if (ta === 'justify') return AlignmentType.JUSTIFIED;
  return fallback;
}

// ---------------------------------------------------------------------------
// DOCX: блочный HTML-элемент → Paragraph[]
// ---------------------------------------------------------------------------

function blockToParagraphs(el: HTMLElement): Paragraph[] {
  const tag = el.tagName.toLowerCase();

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const size = tag === 'h1' ? PT_H1 : PT_H2;
    const align = readAlign(el, AlignmentType.LEFT);
    const runs = Array.from(el.childNodes).flatMap(n => parseInline(n, { bold: true }));
    return [new Paragraph({
      children: runs.length
        ? runs
        : [new TextRun({ text: el.textContent ?? '', font: FONT, size, bold: true })],
      alignment: align,
      spacing: { before: 280, after: 140, line: LINE_SPACE, lineRule: LINE_RULE },
    })];
  }

  if (tag === 'ul' || tag === 'ol') {
    return Array.from(el.children)
      .filter(c => c.tagName.toLowerCase() === 'li')
      .map((li, i) => {
        const prefix = tag === 'ol' ? `${i + 1}.\t` : '•\t';
        const runs = Array.from(li.childNodes).flatMap(n => parseInline(n, {}));
        return new Paragraph({
          children: [new TextRun({ text: prefix, font: FONT, size: PT_BODY }), ...runs],
          spacing: { after: 80, line: LINE_SPACE, lineRule: LINE_RULE },
          indent: { left: 720, hanging: 360 },
        });
      });
  }

  if (tag === 'blockquote') {
    const runs = Array.from(el.childNodes).flatMap(n => parseInline(n, { italics: true }));
    return [new Paragraph({
      children: runs,
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 0, line: LINE_SPACE, lineRule: LINE_RULE },
      indent: { left: 720, right: 720 },
    })];
  }

  if (tag === 'p' || tag === 'div') {
    const runs  = Array.from(el.childNodes).flatMap(n => parseInline(n, {}));
    const empty = !el.textContent?.trim();
    const align = readAlign(el, AlignmentType.JUSTIFIED);
    // Красная строка только для выровненных по ширине непустых абзацев
    const firstLine = (!empty && align === AlignmentType.JUSTIFIED) ? FIRST_LINE : 0;
    return [new Paragraph({
      children: empty ? [new TextRun('')] : runs,
      alignment: align,
      spacing: { after: 0, line: LINE_SPACE, lineRule: LINE_RULE },
      indent: firstLine ? { firstLine } : undefined,
    })];
  }

  const text = el.textContent?.trim() ?? '';
  if (!text) return [];
  return [new Paragraph({
    children: [new TextRun({ text, font: FONT, size: PT_BODY })],
    spacing: { after: 0, line: LINE_SPACE, lineRule: LINE_RULE },
  })];
}

function htmlToParagraphs(html: string): Paragraph[] {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const out: Paragraph[] = [];
  wrap.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      out.push(...blockToParagraphs(node as HTMLElement));
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) out.push(new Paragraph({
        children: [new TextRun({ text, font: FONT, size: PT_BODY })],
        spacing: { after: 0, line: LINE_SPACE, lineRule: LINE_RULE },
        indent: { firstLine: FIRST_LINE },
      }));
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

export async function exportToDOCX(book: Book) {
  try {
    const children: Paragraph[] = [];

    // Титульная страница
    children.push(
      new Paragraph({
        children: [new TextRun({ text: book.title || 'Без названия', font: FONT, size: PT_TITLE, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4320, after: 560 },
      }),
      new Paragraph({
        children: [new TextRun({ text: book.author || '', font: FONT, size: PT_AUTHOR, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    book.chapters.forEach((chapter, index) => {
      if (index > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

      children.push(new Paragraph({
        children: [new TextRun({ text: chapter.title, font: FONT, size: PT_H1, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 560, line: LINE_SPACE, lineRule: LINE_RULE },
      }));

      children.push(...htmlToParagraphs(chapter.content));
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top:    convertMillimetersToTwip(MM.top),
              bottom: convertMillimetersToTwip(MM.bottom),
              left:   convertMillimetersToTwip(MM.left),
              right:  convertMillimetersToTwip(MM.right),
            },
          },
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${book.title || 'book'}.docx`);
  } catch (err) {
    console.error('DOCX export error:', err);
    alert('Ошибка при экспорте в DOCX.');
  }
}

// ---------------------------------------------------------------------------
// PDF: открываем новое окно с готовым HTML и вызываем window.print().
// Браузер рендерит нативно — кириллица, шрифты, выравнивание работают всегда.
// Пользователь выбирает «Сохранить как PDF» в диалоге печати.
// ---------------------------------------------------------------------------

export function exportToPDF(book: Book) {
  const chaptersHtml = book.chapters.map(ch => {
    // TipTap сохраняет style="text-align:..." на <p> — передаём как есть
    const safeContent = ch.content || '<p></p>';
    return `
      <div class="chapter">
        <h2 class="chapter-title">${ch.title}</h2>
        <div class="chapter-body">${safeContent}</div>
      </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${book.title || 'Книга'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${MM.top}mm ${MM.right}mm ${MM.bottom}mm ${MM.left}mm;
    }

    * { box-sizing: border-box; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* Титульная страница */
    .title-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    .title-page h1 {
      font-size: 28pt;
      font-weight: bold;
      margin: 0 0 16pt;
    }
    .title-page .author {
      font-size: 18pt;
      font-style: italic;
      margin: 0;
    }

    /* Главы */
    .chapter { page-break-before: always; }

    .chapter-title {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin: 0 0 16pt;
      page-break-after: avoid;
    }

    /* Тело главы.
       Дефолт — justify + красная строка.
       TipTap пишет style="text-align:center" прямо на <p> —
       inline style перекрывает CSS-правило автоматически (специфичность 1000 vs 1). */
    .chapter-body p {
      font-size: 12pt;
      line-height: 1.5;
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0;
    }
    /* Явное выравнивание — убираем красную строку */
    .chapter-body p[style*="text-align: center"],
    .chapter-body p[style*="text-align:center"],
    .chapter-body p[style*="text-align: right"],
    .chapter-body p[style*="text-align:right"],
    .chapter-body p[style*="text-align: left"],
    .chapter-body p[style*="text-align:left"] {
      text-indent: 0;
    }

    .chapter-body h1, .chapter-body h2, .chapter-body h3 {
      font-weight: bold;
      text-indent: 0;
      margin: 10pt 0 5pt;
      page-break-after: avoid;
    }
    .chapter-body h1 { font-size: 16pt; }
    .chapter-body h2 { font-size: 14pt; }
    .chapter-body h3 { font-size: 13pt; }

    .chapter-body ul, .chapter-body ol {
      font-size: 12pt;
      line-height: 1.5;
      margin: 5pt 0;
      padding-left: 1.5cm;
    }

    .chapter-body strong { font-weight: bold; }
    .chapter-body em     { font-style: italic; }
    .chapter-body u      { text-decoration: underline; }
    .chapter-body blockquote { font-style: italic; margin: 8pt 1.5cm; }

    p, h1, h2, h3, li { page-break-inside: avoid; }

    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${book.title || 'Без названия'}</h1>
    <p class="author">${book.author || ''}</p>
  </div>
  ${chaptersHtml}
  <script>
    window.onload = function() {
      window.print();
    };
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Разрешите всплывающие окна в браузере для экспорта PDF');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
