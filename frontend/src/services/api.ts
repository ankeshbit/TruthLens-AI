// VeriShot AI — API Service
import axios, { AxiosError } from 'axios';
import type { AnalysisResult, HealthStatus, HistoryEntry } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 minutes for analysis
});

export class ApiError extends Error {
  statusCode?: number;
  detail?: string;

  constructor(
    message: string,
    statusCode?: number,
    detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ detail?: string }>;
    const detail = axiosErr.response?.data?.detail;
    const status = axiosErr.response?.status;
    
    if (!axiosErr.response) {
      throw new ApiError(
        'Cannot connect to VeriShot backend. Please ensure the backend server is running.',
        0,
        'Backend unavailable'
      );
    }
    
    throw new ApiError(
      detail || `Server error (${status})`,
      status,
      detail,
    );
  }
  throw new ApiError('An unexpected error occurred');
}

export async function analyzeScreenshot(
  file: File,
  onUploadProgress?: (progress: number) => void,
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<AnalysisResult>('/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getHealth(): Promise<HealthStatus> {
  try {
    const response = await api.get<HealthStatus>('/health');
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const response = await api.get<HistoryEntry[]>('/history');
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await api.delete('/history');
  } catch (error) {
    handleAxiosError(error);
  }
}
