export type Priority = "High" | "Medium" | "Low";
export type Status = "Pending" | "Completed" | "pending" | "completed";

export interface ActionItem {
  id: string;
  task: string;
  client?: string | null;
  project?: string | null;
  date?: string | null;
  description?: string;
  priority?: Priority;
  deadline?: string | null;
  status: string;
  savedAt?: string | null;
}

// Simplified API response — decisions ARE the actions
export interface AnalysisResponse {
  summary: string;
  decisions: string[];
}

export interface ProjectStreamItem {
  id: string;
  name: string;
  status: string;
  badge: string;
}

export interface DashboardStats {
  totalCommunications: number;
  savedItems: number;
  pendingActions: number;
  completedActions: number;
}
