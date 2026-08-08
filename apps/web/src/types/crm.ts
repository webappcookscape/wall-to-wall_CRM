export interface LeadTag {
  id: string;
  name: string;
}

export interface LeadActivity {
  id: string;
  type: 'STATUS_CHANGE' | 'NOTE' | 'ASSIGNMENT' | 'SYSTEM' | 'EMAIL' | 'SMS' | 'PHONE' | 'VISIT';
  content: string;
  user?: { fullName: string; role?: string } | null;
  createdAt: string;
}

export interface Brand { id: string; name: string; logo?: string | null; }
export interface Project { id: string; name: string; }
export interface Source { id: string; name: string; }
export interface LeadStatus { id: string; name: string; color?: string; }
export interface Stage { id: string; name: string; }

export type Role = 'ADMIN' | 'CRE' | 'FEASIBILITY' | 'DESIGNER' | 'BUSINESS_HEAD' | 'DM_EXECUTIVE';
export interface UserBasic { id: string; fullName: string; role?: Role; }

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: boolean;
  avatar?: string | null;
  showroomId?: string | null;
  showroom?: { id: string; name: string } | null;
  signaturePhotoId?: string | null;
  signaturePhoto?: { id: string; name: string; path: string } | null;
  businessHeadId?: string | null;
  businessHead?: UserBasic | null;
  subordinates?: UserBasic[];
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  leadId: number;
  name: string;
  email: string | null;
  phone: string;
  rating: number;
  nextFollowUp: string | null;
  assignedToId?: string | null;
  assignedTo?: UserBasic | null;
  createdBy?: UserBasic | null;
  status: LeadStatus | string | null;
  statusId: string | null;
  source?: Source | null;
  sourceId?: string | null;
  project?: Project | null;
  projectId?: string | null;
  brand?: Brand | null;
  brandId?: string | null;
  currentStage?: Stage | null;
  currentStageId?: string | null;
  tags?: LeadTag[];
  comments: string | null;
  leadType?: string | null;
  instructionToPass?: string | null;
  dataCollected?: string | null;
  contactableDate?: string | null;
  createdAt: string;
  updatedAt: string;
  activities?: LeadActivity[];
}

export interface MasterData {
  brands: Brand[];
  projects: Project[];
  sources: Source[];
  statuses: LeadStatus[];
  stages: Stage[];
  users: UserBasic[];
  leadTags: LeadTag[];
  showrooms: any[];
  bankDetails?: any[];
  scopeOfWorks?: any[];
  paymentModes?: any[];
  salutations?: any[];
  splitUps?: any[];
  activityTypes?: any[];
  vendorSources?: any[];
  productionHolds?: any[];
  workNotifications?: any[];
}

export interface DashboardStats {
  totalLeads?: number;
  freshlead: number;
  yettofollow: number;
  followup: number;
  opportunities: number;
  orderbook: number;
  disqualified: number;
  creleads: number;
  fealeads: number;
  designlead: number;
  designCompleted?: number;
  remindersDue?: number;
}

