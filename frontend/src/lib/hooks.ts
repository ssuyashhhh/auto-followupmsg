import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Campaign,
  CampaignListResponse,
  Contact,
  ContactListResponse,
  ContactStats,
  GenerationStats,
  GenerationTaskResponse,
  MessageListResponse,
  PromptTemplate,
  TaskStatus,
  UploadListResponse,
} from "@/lib/types";

// ============================================
// Campaigns
// ============================================

export function useCampaigns() {
  return useQuery<CampaignListResponse>({
    queryKey: ["campaigns"],
    queryFn: () => api.get("/campaigns/").then((r) => r.data),
  });
}

export function useCampaign(id: string) {
  return useQuery<Campaign>({
    queryKey: ["campaigns", id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post("/campaigns/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; status?: string }) =>
      api.patch(`/campaigns/${id}`, data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaigns", vars.id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

// ============================================
// Uploads
// ============================================

export function useCampaignUploads(campaignId: string) {
  return useQuery<UploadListResponse>({
    queryKey: ["uploads", campaignId],
    queryFn: () => api.get(`/uploads/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, file }: { campaignId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(`/uploads/campaign/${campaignId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["uploads", vars.campaignId] });
      qc.invalidateQueries({ queryKey: ["contacts", vars.campaignId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/uploads/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

// ============================================
// Contacts
// ============================================

export function useCampaignContacts(
  campaignId: string,
  params?: { search?: string; status?: string; company?: string; skip?: number; limit?: number }
) {
  return useQuery<ContactListResponse>({
    queryKey: ["contacts", campaignId, params],
    queryFn: () =>
      api.get(`/contacts/campaign/${campaignId}`, { params }).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useContactStats(campaignId: string) {
  return useQuery<ContactStats>({
    queryKey: ["contacts", campaignId, "stats"],
    queryFn: () =>
      api.get(`/contacts/campaign/${campaignId}/stats`).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: () => api.get(`/contacts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; full_name?: string; email?: string; company?: string; role?: string; notes?: string }) =>
      api.patch(`/contacts/${id}`, data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contact", data.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ============================================
// Messages
// ============================================

export function useCampaignMessages(
  campaignId: string,
  params?: { message_type?: string; skip?: number; limit?: number; active_only?: boolean }
) {
  return useQuery<MessageListResponse>({
    queryKey: ["messages", campaignId, params],
    queryFn: () =>
      api.get(`/messages/campaign/${campaignId}`, { params }).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useContactMessages(contactId: string) {
  return useQuery<MessageListResponse>({
    queryKey: ["messages", "contact", contactId],
    queryFn: () =>
      api.get(`/messages/contact/${contactId}`).then((r) => r.data),
    enabled: !!contactId,
  });
}

export function useGenerationStats(campaignId: string) {
  return useQuery<GenerationStats>({
    queryKey: ["messages", campaignId, "stats"],
    queryFn: () =>
      api.get(`/messages/campaign/${campaignId}/stats`).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useGenerateMessages() {
  const qc = useQueryClient();
  return useMutation<GenerationTaskResponse, Error, { campaign_id: string; message_type?: string; model?: string; prompt_template_id?: string; custom_instructions?: string }>({
    mutationFn: (data) =>
      api.post("/messages/generate", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.campaign_id] });
    },
  });
}

export function useRegenerateMessage() {
  const qc = useQueryClient();
  return useMutation<GenerationTaskResponse, Error, { contact_id: string; campaign_id: string; message_type?: string; model?: string; prompt_template_id?: string; custom_instructions?: string }>({
    mutationFn: (data) =>
      api.post("/messages/regenerate", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", "contact", vars.contact_id] });
      qc.invalidateQueries({ queryKey: ["messages", vars.campaign_id] });
    },
  });
}

// ============================================
// Tasks
// ============================================

export function useTaskStatus(taskId: string | null) {
  return useQuery<TaskStatus>({
    queryKey: ["tasks", taskId],
    queryFn: () => api.get(`/tasks/${taskId}`).then((r) => r.data),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "SUCCESS" || data.status === "FAILURE" || data.status === "REVOKED") {
        return false;
      }
      return 2000; // Poll every 2s while running
    },
  });
}

// ============================================
// Prompt Templates
// ============================================

export function usePromptTemplates(messageType?: string) {
  return useQuery<{ templates: PromptTemplate[]; total: number }>({
    queryKey: ["prompts", messageType],
    queryFn: () =>
      api.get("/prompts/", { params: messageType ? { message_type: messageType } : {} }).then((r) => r.data),
  });
}
