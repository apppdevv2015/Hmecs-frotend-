import { apiRequest } from "./api";

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
};

export type TicketStatus =
  | "Open"
  | "Assigned"
  | "In Progress"
  | "Waiting for Customer"
  | "Resolved"
  | "Closed";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  companyId: string;
  createdById: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    companyCode: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  messages?: TicketMessage[];
};

export type CreateTicketPayload = {
  subject: string;
  description: string;
  category?: string;
  priority?: TicketPriority;
  companyId?: string;
};

export const ticketService = {
  getTickets: async (params?: {
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: Ticket[]; pagination: any }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.priority) query.append("priority", params.priority);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const response: any = await apiRequest(`/tickets?${query.toString()}`);
    const data = response?.data || response;

    return {
      tickets: Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data) ? data : [],
      pagination: data?.pagination || { total: 0, page: 1, limit: 50, pages: 1 },
    };
  },

  getTicket: async (id: string): Promise<Ticket> => {
    const response: any = await apiRequest(`/tickets/${id}`);
    return response?.data || response;
  },

  createTicket: async (payload: CreateTicketPayload): Promise<Ticket> => {
    const response: any = await apiRequest("/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response?.data || response;
  },

  addMessage: async (ticketId: string, message: string): Promise<TicketMessage> => {
    const response: any = await apiRequest(`/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    return response?.data || response;
  },

  updateStatus: async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
    const response: any = await apiRequest(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response?.data || response;
  },

  assignTicket: async (ticketId: string, assignedToId?: string): Promise<Ticket> => {
    const response: any = await apiRequest(`/tickets/${ticketId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedToId }),
    });
    return response?.data || response;
  },
};

export default ticketService;
