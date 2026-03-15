import { saveAs } from 'file-saver';
import { Book } from '../../types';
import { sanitizeHtml } from '../sanitize';
import { escapeHtml, MM } from './shared';
import { Exporter } from './exporter.interface';

export class PdfExporter implements Exporter {
  readonly extension = 'pdf';

  export(book: Book): void {
    const chaptersHtml = book.chapters.map(ch => {
      const safeContent = sanitizeHtml(ch.content || '<p></p>');
      return `
        <div class="chapter">
          <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
          <div class="chapter-body">${safeContent}</div>
        </div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(book.title || 'Книга')}</title>
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
    <h1>${escapeHtml(book.title || 'Без названия')}</h1>
    <p class="author">${escapeHtml(book.author || '')}</p>
  </div>
  ${chaptersHtml}
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 500);
      }
    };
  }
}
