import { saveAs } from 'file-saver';
import { Book } from '../../types';
import { MM } from './shared';
import { Exporter } from './exporter.interface';
import { htmlToParagraphs } from './html-to-docx';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  Packer,
  convertMillimetersToTwip,
} from 'docx';

const FONT      = 'Times New Roman';
const PT_TITLE  = 56; // 28 pt
const PT_AUTHOR = 36; // 18 pt
const PT_H1     = 32; // 16 pt
const LINE_RULE = 'auto' as const;
const LINE_SPACE = 276;

export class DocxExporter implements Exporter {
  readonly extension = 'docx';

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
}
