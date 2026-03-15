/**
 * Экранирует HTML-спецсимволы (&, <, >, ") для вставки в XML/HTML атрибуты
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Общие геометрия документа для экспорта (поля: левое 30 мм, правое 15 мм, верх 20 мм, низ 20 мм)
 */
export const MM = {
  left:   30,
  right:  15,
  top:    20,
  bottom: 20,
};
