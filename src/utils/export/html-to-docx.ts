import {
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
  convertMillimetersToTwip,
} from 'docx';
import { sanitizeHtml } from '../sanitize';

const FONT       = 'Times New Roman';
const PT_BODY    = 24; // half-points → 12 pt
const PT_H1      = 32; // 16 pt
const PT_H2      = 28; // 14 pt
const FIRST_LINE = convertMillimetersToTwip(12.5);
const LINE_RULE  = 'auto' as const;
const LINE_SPACE = 276;

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

function readAlign(el: HTMLElement, fallback: typeof AlignmentType[keyof typeof AlignmentType]) {
  const ta = el.style.textAlign;
  if (ta === 'center')  return AlignmentType.CENTER;
  if (ta === 'right')   return AlignmentType.RIGHT;
  if (ta === 'left')    return AlignmentType.LEFT;
  if (ta === 'justify') return AlignmentType.JUSTIFIED;
  return fallback;
}

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

export function htmlToParagraphs(html: string): Paragraph[] {
  const wrap = document.createElement('div');
  wrap.innerHTML = sanitizeHtml(html);
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
