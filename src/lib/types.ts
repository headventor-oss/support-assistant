export interface Dataset {
  id: number;
  name: string;
  version: number;
  questionCol: string;
  answerCol: string;
  categoryCol: string | null;
  isActive: boolean;
  createdAt: string;
  entryCount: number;
}

export interface UploadResponse {
  columns: string[];
  preview: Record<string, unknown>[];
  rows: Record<string, unknown>[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  found: boolean;
}

export interface TicketPayload {
  query: string;
  conversation: ChatMessage[];
  name?: string;
  email?: string;
  description?: string;
}

export interface TicketResponse {
  success: boolean;
  ticketId: string;
}

export interface AnalysisEntry {
  category: string | null;
  type: string | null;
  status: string | null;
  issueDate: string | null;
  resolutionDate: string | null;
  eta: string | null;
}

export interface AnalysisInsights {
  executiveSummary: string;
  keyThemes: { theme: string; description: string }[];
  rootCauses: { cause: string; description: string }[];
  recommendations: string[];
  riskAreas: { area: string; severity: "High" | "Medium" | "Low"; note: string }[];
}

export interface AnalysisResponse {
  hasActive: boolean;
  datasetName: string | null;
  hasAnalytics: boolean;
  analysis: AnalysisInsights | null;
  entries: AnalysisEntry[];
}
