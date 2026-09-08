export type Priority = "High" | "Medium" | "Low";
export type Status = "Pending" | "Completed";

export interface ActionItem {
  id: string;
  client: string;
  project: string;
  date: string;
  description: string;
  priority: Priority;
  deadline?: string;
  status: Status;
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
