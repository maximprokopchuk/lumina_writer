import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Book } from '../types';

export async function exportToPDF(book: Book) {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 10;

  // Title Page
  doc.setFontSize(24);
  doc.text(book.title || 'Без названия', pageWidth / 2, 100, { align: 'center' });
  doc.setFontSize(16);
  doc.text(book.author || 'Автор', pageWidth / 2, 120, { align: 'center' });
  doc.addPage();

  // Chapters
  book.chapters.forEach((chapter, index) => {
    if (index > 0) doc.addPage();
    y = 20;
    
    doc.setFontSize(18);
    doc.text(chapter.title, margin, y);
    y += lineHeight * 2;

    doc.setFontSize(12);
    // Simple HTML to text conversion for PDF (basic)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapter.content;
    const text = tempDiv.innerText || tempDiv.textContent || '';
    
    const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
    
    splitText.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 7;
    });
  });

  doc.save(`${book.title || 'book'}.pdf`);
}

export async function exportToDOCX(book: Book) {
  const sections = book.chapters.map(chapter => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapter.content;
    const text = tempDiv.innerText || tempDiv.textContent || '';

    return {
      properties: {},
      children: [
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        ...text.split('\n').map(line => new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 200 },
        })),
      ],
    };
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: book.title || 'Без названия',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: book.author || 'Автор',
            alignment: AlignmentType.CENTER,
            spacing: { after: 1000 },
          }),
        ],
      },
      ...sections,
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${book.title || 'book'}.docx`);
}
