// ============================================
// API Response Types
// ============================================

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  total_contacts: number;
  messages_generated: number;
  messages_sent: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  campaign_id: string;
  upload_id: string | null;
  full_name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  contact_id: string;
  campaign_id: string;
  message_type: string;
  content: string;
  word_count: number;
  version: number;
  is_active: boolean;
  status: string;
  ai_model: string;
  prompt_template: string | null;
  ai_metadata: Record<string, unknown> | null;
  generated_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Upload {
  id: string;
  campaign_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  row_count: number | null;
  parsed_count: number;
  failed_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  user_id: string | null;
  name: string;
  message_type: string;
  system_prompt: string;
  user_prompt: string;
  is_default: boolean;
  is_system: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  task_id: string;
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";
  result: Record<string, unknown> | null;
  error: string | null;
  progress: Record<string, unknown> | null;
}

// ============================================
// List Responses
// ============================================

export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  has_more: boolean;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
}

export interface UploadListResponse {
  uploads: Upload[];
  total: number;
}

export interface GenerationStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ContactStats {
  total: number;
  by_status: Record<string, number>;
  by_company: Record<string, number>;
}

export interface GenerationTaskResponse {
  task_id: string;
  contact_count: number;
  message_type: string;
  message: string;
}
