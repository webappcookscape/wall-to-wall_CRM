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

export type Role = 'ADMIN' | 'BUSINESS_HEAD' | 'DM_EXECUTIVE' | 'FA' | 'LA' | 'VENDOR_MANAGEMENT' | 'CLIENT_FACILITATOR';
export interface UserBasic { id: string; fullName: string; role?: Role; }

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: boolean;
  metaAccess?: boolean;
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
  createdById?: string | null;
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
  orderValue?: number | null;
  metaLeadId?: string | null;
  metaFormId?: string | null;
  metaAdId?: string | null;
  metaCampaignId?: string | null;
  metaAdAccountId?: string | null;
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

export interface EmployeePerformance {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
  totalAssigned: number;
  yettofollow: number;
  followup: number;
  opportunities: number;
  orderbook: number;
  disqualified: number;
  remindersDue: number;
  conversionRate: string;
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
  upcomingReminders?: {
    id: string;
    leadId: number;
    name: string;
    phone: string;
    contactableDate: string;
    status?: { name: string };
    project?: { name: string };
    assignedTo?: { fullName: string };
  }[];
  selectedEmployee?: {
    id: string;
    fullName: string;
    role: string;
    email: string;
  } | null;
  employeeBreakdown?: EmployeePerformance[];
}

