export interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: string;
  doi?: string;
  journal?: string;
  abstract?: string;
  research_question?: string;
  major_findings?: string;
  suggestions?: string;
}

export interface MindMapNode {
  id: string;
  title: string;
  level: number;
  parentId: string | null;
  references: Reference[];
  children: MindMapNode[];
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: string;
  doi?: string;
  journal?: string;
  abstract?: string;
  research_question?: string;
  major_findings?: string;
  suggestions?: string;
} 