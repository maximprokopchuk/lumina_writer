export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
  updatedAt: number;
  /** Exact database timestamp used for optimistic concurrency. */
  cloudVersion?: string;
  isPlaceholder?: boolean;
  recoveryOf?: string;
}

export interface LocalBook {
  book: Book;
  baseVersion: string | null;
  dirty: boolean;
  deleted: boolean;
  changeId: string;
}
