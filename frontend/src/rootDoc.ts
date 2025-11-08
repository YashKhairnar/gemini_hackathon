import { type AutomergeUrl } from "@automerge/react";
export type RootDocument = {
  taskLists: AutomergeUrl[];
  // Map file paths to Automerge document URLs for collaborative editing
  files: { [filePath: string]: AutomergeUrl };
};

export type FileDocument = {
  path: string;
  content: string;
  lastModified: number;
};