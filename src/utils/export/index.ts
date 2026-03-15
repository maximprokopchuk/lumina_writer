import { Book } from '../../types';
import { DocxExporter } from './docx.exporter';
import { PdfExporter } from './pdf.exporter';
import { Fb2Exporter } from './fb2.exporter';

export * from './exporter.interface';

export const exportToDOCX = async (book: Book) => {
  const exporter = new DocxExporter();
  await exporter.export(book);
};

export const exportToPDF = (book: Book) => {
  const exporter = new PdfExporter();
  exporter.export(book);
};

export const exportToFB2 = (book: Book) => {
  const exporter = new Fb2Exporter();
  exporter.export(book);
};
