export interface Campaign {
  id: string;
  title: string;
  status: 'active' | 'draft' | 'completed';
  contacts: number;
  messages: number;
  lastActive?: string;
  createdDate?: string;
  endDate?: string;
  responseRate?: string;
  avatars?: string[];
}

export interface Stat {
  label: string;
  value: string;
  icon: string;
  color: 'primary' | 'secondary' | 'tertiary';
}
