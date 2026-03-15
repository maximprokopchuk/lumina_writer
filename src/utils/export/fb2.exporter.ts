import { saveAs } from 'file-saver';
import { Book } from '../../types';
import { escapeHtml } from './shared';
import { Exporter } from './exporter.interface';

export class Fb2Exporter implements Exporter {
  readonly extension = 'fb2';

  export(book: Book): void {
    const processHtmlToFb2 = (html: string) => {
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      let fb2Text = '';
      
      const parseNode = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Escape XML properly
          const text = node.textContent || '';
          fb2Text += text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        
        if (tag === 'p' || tag === 'div') {
          fb2Text += '<p>';
          Array.from(el.childNodes).forEach(parseNode);
          fb2Text += '</p>\n';
        } else if (tag === 'strong' || tag === 'b') {
          fb2Text += '<strong>';
          Array.from(el.childNodes).forEach(parseNode);
          fb2Text += '</strong>';
        } else if (tag === 'em' || tag === 'i') {
          fb2Text += '<emphasis>';
          Array.from(el.childNodes).forEach(parseNode);
          fb2Text += '</emphasis>';
        } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
          fb2Text += '<subtitle>';
          Array.from(el.childNodes).forEach(parseNode);
          fb2Text += '</subtitle>\n';
        } else if (tag === 'br') {
          fb2Text += '<empty-line/>\n';
        } else if (tag === 'blockquote') {
          fb2Text += '<cite>';
          Array.from(el.childNodes).forEach(parseNode);
          fb2Text += '</cite>\n';
        } else if (tag === 'ul' || tag === 'ol') {
          Array.from(el.children).forEach(li => {
            if (li.tagName.toLowerCase() === 'li') {
              fb2Text += '<p>• ';
              Array.from(li.childNodes).forEach(parseNode);
              fb2Text += '</p>\n';
            }
          });
        } else {
          Array.from(el.childNodes).forEach(parseNode);
        }
      };
      
      Array.from(wrap.childNodes).forEach(parseNode);
      return fb2Text;
    };

    const uuid = crypto.randomUUID ? crypto.randomUUID() : '12345-67890';
    const authorParts = (book.author || 'Неизвестный автор').split(' ', 2);
    const firstName = escapeHtml(authorParts[0] || 'Неизвестный');
    const lastName = escapeHtml(authorParts[1] || 'автор');
    const bookTitle = escapeHtml(book.title || 'Без названия');
    const dateStr = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>prose</genre>
      <author>
        <first-name>${firstName}</first-name>
        <last-name>${lastName}</last-name>
      </author>
      <book-title>${bookTitle}</book-title>
      <lang>ru</lang>
    </title-info>
    <document-info>
      <author>
        <first-name>${firstName}</first-name>
        <last-name>${lastName}</last-name>
      </author>
      <program-used>Lumina Write</program-used>
      <date value="${dateStr}">${dateStr}</date>
      <id>${uuid}</id>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
    <title>
      <p>${bookTitle}</p>
    </title>`;

    book.chapters.forEach(ch => {
      const safeContent = ch.content || '<p></p>';
      xml += `
    <section>
      <title>
        <p>${escapeHtml(ch.title || 'Глава')}</p>
      </title>
      ${processHtmlToFb2(safeContent)}
    </section>`;
    });

    xml += `
  </body>
</FictionBook>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    saveAs(blob, `${book.title || 'book'}.fb2`);
  }
}
