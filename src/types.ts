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
}
