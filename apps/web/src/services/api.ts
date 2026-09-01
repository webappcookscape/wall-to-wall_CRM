import axios from 'axios';
import type { Lead, DashboardStats, User } from '../types/crm';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : '/api/v1');

// Add a request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password?: string): Promise<{ token: string, user: User }> => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    return response.data.data;
  },
  googleLogin: async (credential: string): Promise<{ token: string, user: User }> => {
    const response = await axios.post(`${API_BASE_URL}/auth/google-login`, { credential });
    return response.data.data;
  },
  getMe: async (): Promise<User> => {
    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response.data.data;
  }
};

export const leadService = {
  getLeads: async (params: { 
    page: number, 
    limit: number, 
    search?: string, 
    statusIds?: string[],
    statusId?: string, 
    projectIds?: string[],
    brandId?: string, 
    brandIds?: string[],
    projectId?: string, 
    sourceIds?: string[],
    tagId?: string, 
    stageId?: string,
    stageIds?: string[],
    rating?: string | number,
    timeframe?: string,
    contactDate?: string,
    assignedToIds?: string[]
  }): Promise<{ data: Lead[], total: number }> => {
    const response = await axios.post(`${API_BASE_URL}/leads/list`, params);
    return response.data.data;
  },


  getLead: async (id: string): Promise<Lead> => {
    const response = await axios.get(`${API_BASE_URL}/leads/${id}`);
    return response.data.data;
  },

  bulkImportLeads: async (payload: {
    leads: any[];
    defaultBrandId?: string;
    defaultProjectId?: string;
    defaultSourceId?: string;
  }): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/leads/import`, payload);
    return response.data;
  },

  getContactableCounts: async (userId?: string): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/leads/contactable-counts`, { params: { userId } });
    return response.data.data;
  },
  
  getStats: async (params?: { userId?: string; timeframe?: string }): Promise<DashboardStats> => {
    const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, { params });
    return response.data.data;
  },

  getActivities: async (filters: any): Promise<any[]> => {
    const response = await axios.post(`${API_BASE_URL}/leads/activities`, filters);
    return response.data.data;
  },

  getMasters: async (): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/masters`);
    return response.data.data;
  },

  createMaster: async (type: string, data: any): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/masters`, { type, ...data });
    return response.data.data;
  },

  updateMaster: async (type: string, id: string, data: any): Promise<any> => {
    const response = await axios.put(`${API_BASE_URL}/masters/${type}/${id}`, data);
    return response.data.data;
  },

  deleteMaster: async (type: string, id: string): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/masters/${type}/${id}`);
    return response.data;
  },

  createLead: async (leadData: Partial<Lead>): Promise<Lead> => {
    const response = await axios.post(`${API_BASE_URL}/leads`, leadData);
    return response.data.data;
  },

  assignLead: async (leadId: string, userId: string): Promise<any> => {
    const response = await axios.put(`${API_BASE_URL}/leads/${leadId}/assign`, { user_id: userId });
    return response.data.data;
  },

  bulkAssignLeads: async (leadIds: string[], userId: string): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/leads/bulk-assign`, { leadIds, userId });
    return response.data;
  },

  updateLead: async (leadId: string, leadData: Partial<Lead>): Promise<Lead> => {
    const response = await axios.put(`${API_BASE_URL}/leads/${leadId}`, leadData);
    return response.data.data;
  },

  addLeadActivity: async (leadId: string, activityData: { type: string, content: string }): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/leads/${leadId}/activities`, activityData);
    return response.data.data;
  },

  deleteLead: async (leadId: string): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/leads/${leadId}`);
    return response.data;
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users`);
    return response.data.data;
  },

  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await axios.post(`${API_BASE_URL}/users`, userData);
    return response.data.data;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await axios.put(`${API_BASE_URL}/users/${id}`, userData);
    return response.data.data;
  },

  deleteUser: async (id: string, force = false): Promise<any> => {
    const url = force ? `${API_BASE_URL}/users/${id}?force=true` : `${API_BASE_URL}/users/${id}`;
    const response = await axios.delete(url);
    return response.data;
  },

  // Photos
  getPhotos: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/photos`);
    return response.data.data;
  },

  uploadPhoto: async (formData: FormData): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  deletePhoto: async (id: string): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/photos/${id}`);
    return response.data;
  }
};

export const reportService = {
  getUserPerformance: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/report/user-performance`);
    return response.data.data;
  },
  getLeadsMaster: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/report/leads-master`);
    return response.data.data;
  }
};
