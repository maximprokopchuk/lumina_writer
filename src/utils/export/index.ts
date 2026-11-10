import { Book } from '../../types';

export * from './exporter.interface';

export const exportToDOCX = async (book: Book) => {
  const { DocxExporter } = await import('./docx.exporter');
  const exporter = new DocxExporter();
  await exporter.export(book);
};

export const exportToPDF = async (book: Book) => {
  const { PdfExporter } = await import('./pdf.exporter');
  const exporter = new PdfExporter();
  exporter.export(book);
};

export const exportToFB2 = async (book: Book) => {
  const { Fb2Exporter } = await import('./fb2.exporter');
  const exporter = new Fb2Exporter();
  exporter.export(book);
};
