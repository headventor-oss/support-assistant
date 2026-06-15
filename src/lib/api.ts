import type {
  AnalysisResponse,
  ChatMessage,
  ChatResponse,
  Dataset,
  TicketPayload,
  TicketResponse,
  UploadResponse,
} from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function uploadExcel(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/api/admin/upload", {
    method: "POST",
    body: formData,
  });
}

export function listDatasets(): Promise<Dataset[]> {
  return request<Dataset[]>("/api/admin/datasets");
}

export function saveDataset(payload: {
  name: string;
  questionCol: string;
  answerCol: string;
  categoryCol?: string;
  dateCol?: string;
  typeCol?: string;
  statusCol?: string;
  resolutionDateCol?: string;
  etaCol?: string;
  rows: Record<string, unknown>[];
}): Promise<{ id: number }> {
  return request("/api/admin/datasets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setActiveDataset(id: number): Promise<{ success: boolean }> {
  return request("/api/admin/datasets", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
}

export function deleteDataset(id: number): Promise<{ success: boolean }> {
  return request("/api/admin/datasets", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

export function fetchAnalysis(): Promise<AnalysisResponse> {
  return request<AnalysisResponse>("/api/analysis");
}

export function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export function summarizeConversation(
  conversation: ChatMessage[],
  query: string
): Promise<{ summary: string }> {
  return request("/api/ticket", {
    method: "POST",
    body: JSON.stringify({ summarize: true, conversation, query }),
  });
}

export function raiseTicket(payload: TicketPayload): Promise<TicketResponse> {
  return request<TicketResponse>("/api/ticket", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
