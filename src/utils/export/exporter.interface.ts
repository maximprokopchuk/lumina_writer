import { Book } from '../../types';

/**
 * Interface for all export strategires
 */
export interface Exporter {
  /**
   * File extension without a dot (e.g. "pdf", "docx")
   */
  readonly extension: string;

  /**
   * Generates and downloads the output file from the given book
   */
  export(book: Book): Promise<void> | void;
}
