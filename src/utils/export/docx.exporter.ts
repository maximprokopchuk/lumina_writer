import { saveAs } from 'file-saver';
import { Book } from '../../types';
import { sanitizeHtml } from '../sanitize';
import { MM } from './shared';
import { Exporter } from './exporter.interface';
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

const FONT       = 'Times New Roman';
const PT_BODY    = 24; // half-points → 12 pt
const PT_H1      = 32; // 16 pt
const PT_H2      = 28; // 14 pt
const PT_TITLE   = 56; // 28 pt
const PT_AUTHOR  = 36; // 18 pt
const FIRST_LINE = convertMillimetersToTwip(12.5);
const LINE_RULE  = 'auto' as const;
const LINE_SPACE = 276;

interface RunStyle { bold?: boolean; italics?: boolean; underline?: boolean }

export class DocxExporter implements Exporter {
  readonly extension = 'docx';

  private parseInline(node: ChildNode, s: RunStyle): TextRun[] {
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
    return Array.from(el.childNodes).flatMap(c => this.parseInline(c, next));
  }

  private readAlign(el: HTMLElement, fallback: typeof AlignmentType[keyof typeof AlignmentType]) {
    const ta = el.style.textAlign;
    if (ta === 'center')  return AlignmentType.CENTER;
    if (ta === 'right')   return AlignmentType.RIGHT;
    if (ta === 'left')    return AlignmentType.LEFT;
    if (ta === 'justify') return AlignmentType.JUSTIFIED;
    return fallback;
  }

  private blockToParagraphs(el: HTMLElement): Paragraph[] {
    const tag = el.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const size = tag === 'h1' ? PT_H1 : PT_H2;
      const align = this.readAlign(el, AlignmentType.LEFT);
      const runs = Array.from(el.childNodes).flatMap(n => this.parseInline(n, { bold: true }));
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
          const runs = Array.from(li.childNodes).flatMap(n => this.parseInline(n, {}));
          return new Paragraph({
            children: [new TextRun({ text: prefix, font: FONT, size: PT_BODY }), ...runs],
            spacing: { after: 80, line: LINE_SPACE, lineRule: LINE_RULE },
            indent: { left: 720, hanging: 360 },
          });
        });
    }

    if (tag === 'blockquote') {
      const runs = Array.from(el.childNodes).flatMap(n => this.parseInline(n, { italics: true }));
      return [new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 0, line: LINE_SPACE, lineRule: LINE_RULE },
        indent: { left: 720, right: 720 },
      })];
    }

    if (tag === 'p' || tag === 'div') {
      const runs  = Array.from(el.childNodes).flatMap(n => this.parseInline(n, {}));
      const empty = !el.textContent?.trim();
      const align = this.readAlign(el, AlignmentType.JUSTIFIED);
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

  private htmlToParagraphs(html: string): Paragraph[] {
    const wrap = document.createElement('div');
    wrap.innerHTML = sanitizeHtml(html);
    const out: Paragraph[] = [];
    wrap.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        out.push(...this.blockToParagraphs(node as HTMLElement));
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

  async export(book: Book): Promise<void> {
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

        children.push(...this.htmlToParagraphs(chapter.content));
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
}
