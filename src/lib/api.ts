import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, DashboardSummary, PageResponse, Transaction, Category, UserProfile, AuthResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Access Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('flow_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: automatically refresh token on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Catch 401 Unauthorized and 403 Forbidden for token expiration
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('flow_refresh_token');
      if (!refreshToken) {
        // No refresh token available, clear session
        localStorage.removeItem('flow_access_token');
        localStorage.removeItem('flow_refresh_token');
        localStorage.removeItem('flow_user');
        window.dispatchEvent(new Event('flow_auth_logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<ApiResponse<AuthResponse>>(
          `${API_BASE}/auth/refresh`,
          { refreshToken }
        );

        if (refreshResponse.data.success && refreshResponse.data.data) {
          const { accessToken, refreshToken: newRefreshToken, user } = refreshResponse.data.data;
          localStorage.setItem('flow_access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('flow_refresh_token', newRefreshToken);
          }
          if (user) {
            localStorage.setItem('flow_user', JSON.stringify(user));
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          processQueue(null, accessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('flow_access_token');
        localStorage.removeItem('flow_refresh_token');
        localStorage.removeItem('flow_user');
        window.dispatchEvent(new Event('flow_auth_logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  async sendOtp(data: { email: string; purpose?: string }) {
    const res = await apiClient.post<ApiResponse<void>>('/auth/send-otp', data);
    return res.data;
  },

  async verifyOtp(data: { email: string; otpCode: string; purpose?: string }) {
    const res = await apiClient.post<ApiResponse<boolean>>('/auth/verify-otp', data);
    return res.data;
  },

  async register(data: { email: string; password: string; fullName: string; currency?: string; otpCode?: string }) {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return res.data;
  },

  async refresh(refreshToken: string) {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
    return res.data;
  },

  async logout(refreshToken?: string) {
    try {
      const res = await apiClient.post<ApiResponse<void>>('/auth/logout', { refreshToken });
      return res.data;
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('flow_access_token');
        localStorage.removeItem('flow_refresh_token');
        localStorage.removeItem('flow_user');
        window.dispatchEvent(new Event('flow_auth_logout'));
      }
    }
  },

  async getMe() {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data;
  },

  async updateProfile(data: { fullName?: string; currency?: string }) {
    const res = await apiClient.put<ApiResponse<UserProfile>>('/auth/profile', data);
    return res.data;
  },

  // Health
  async checkHealth() {
    const res = await apiClient.get<ApiResponse<any>>('/health');
    return res.data;
  },

  // Categories
  async getCategories(type?: 'EXPENSE' | 'INCOME') {
    const res = await apiClient.get<ApiResponse<Category[]>>('/categories', { params: { type } });
    return res.data;
  },

  async createCategory(data: {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    icon?: string;
    color?: string;
  }) {
    const res = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return res.data;
  },

  // Transactions
  async getTransactions(params?: {
    type?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    size?: number;
  }) {
    const res = await apiClient.get<ApiResponse<PageResponse<Transaction>>>('/transactions', { params });
    return res.data;
  },

  async createTransaction(data: {
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    description: string;
    categoryId?: string;
    transactionDate: string;
    paymentMethod?: string;
    notes?: string;
  }) {
    const res = await apiClient.post<ApiResponse<Transaction>>('/transactions', data);
    return res.data;
  },

  async updateTransaction(id: string, data: {
    type?: 'EXPENSE' | 'INCOME';
    amount?: number;
    description?: string;
    categoryId?: string;
    transactionDate?: string;
    paymentMethod?: string;
    notes?: string;
  }) {
    const res = await apiClient.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
    return res.data;
  },

  async deleteTransaction(id: string) {
    const res = await apiClient.delete<ApiResponse<void>>(`/transactions/${id}`);
    return res.data;
  },

  // Analytics
  async getDashboardSummary() {
    const res = await apiClient.get<ApiResponse<DashboardSummary>>('/analytics/dashboard');
    return res.data;
  },
};
