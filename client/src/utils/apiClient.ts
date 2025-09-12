import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Retry function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async (config: AxiosRequestConfig, retryCount = 0): Promise<AxiosResponse> => {
  try {
    console.log(`🔄 API: Attempting request (${retryCount + 1}/${MAX_RETRIES + 1}):`, config.url);
    const response = await apiClient.request(config);
    console.log(`✅ API: Request successful:`, config.url);
    return response;
  } catch (error: any) {
    console.error(`❌ API: Request failed (attempt ${retryCount + 1}):`, error.message);
    
    // Check if it's a CORS error or network error
    const isCorsError = error.message?.includes('CORS') || 
                       error.message?.includes('Network Error') ||
                       error.code === 'ERR_NETWORK' ||
                       error.response?.status === 0;
    
    const isRetryableError = isCorsError || 
                            (error.response?.status >= 500 && error.response?.status < 600) ||
                            error.response?.status === 429; // Rate limited
    
    if (isRetryableError && retryCount < MAX_RETRIES) {
      console.log(`🔄 API: Retrying request in ${RETRY_DELAY * (retryCount + 1)}ms...`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return retryRequest(config, retryCount + 1);
    }
    
    // If it's a CORS error, try to refresh the page
    if (isCorsError && retryCount >= MAX_RETRIES) {
      console.error('🚫 API: CORS error after retries, suggesting page refresh');
      if (window.confirm('Det oppstod en tilkoblingsfeil. Vil du oppdatere siden?')) {
        window.location.reload();
      }
    }
    
    throw error;
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API: Making request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API: Response received from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API: Response interceptor error:', error);
    return Promise.reject(error);
  }
);

// Wrapper functions for common HTTP methods
export const apiGet = (url: string, config?: AxiosRequestConfig) => 
  retryRequest({ ...config, method: 'GET', url });

export const apiPost = (url: string, data?: any, config?: AxiosRequestConfig) => 
  retryRequest({ ...config, method: 'POST', url, data });

export const apiPut = (url: string, data?: any, config?: AxiosRequestConfig) => 
  retryRequest({ ...config, method: 'PUT', url, data });

export const apiDelete = (url: string, config?: AxiosRequestConfig) => 
  retryRequest({ ...config, method: 'DELETE', url });

export const apiPatch = (url: string, data?: any, config?: AxiosRequestConfig) => 
  retryRequest({ ...config, method: 'PATCH', url, data });

export default apiClient;
