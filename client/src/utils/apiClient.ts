import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const resolveDefaultBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return 'http://localhost:5000';
  }

  return 'https://kartarkiv-production.up.railway.app';
};

const API_BASE_URL = resolveDefaultBaseUrl();

const isTestEnvironment = process.env.NODE_ENV === 'test';

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
const MAX_RETRIES = isTestEnvironment ? 0 : 5;
const RETRY_DELAY = isTestEnvironment ? 0 : 2000; // 2 seconds
const RATE_LIMIT_DELAY = isTestEnvironment ? 0 : 10000; // 10 seconds for rate limiting

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
    
    // Check if it's rate limiting
    const isRateLimited = error.response?.status === 429 || 
                         error.response?.status === 503 ||
                         error.message?.includes('rate limit') ||
                         error.message?.includes('too many requests');
    
    const isRetryableError = isCorsError || 
                            (error.response?.status >= 500 && error.response?.status < 600) ||
                            isRateLimited;
    
    if (isRetryableError && retryCount < MAX_RETRIES) {
      const delay = isRateLimited ? RATE_LIMIT_DELAY : RETRY_DELAY * (retryCount + 1);
      console.log(`🔄 API: Retrying request in ${delay}ms... (${isRateLimited ? 'Rate limited' : 'Error'})`);
      
      // Show user-friendly message for rate limiting
      if (isRateLimited && retryCount === 0) {
        console.log('⏳ API: Rate limited - please wait...');
      }
      
      await sleep(delay);
      return retryRequest(config, retryCount + 1);
    }
    
    // If it's a CORS error, try to refresh the page
    if (!isTestEnvironment && isCorsError && retryCount >= MAX_RETRIES) {
      console.error('🚫 API: CORS error after retries, suggesting page refresh');
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm('Det oppstod en tilkoblingsfeil. Vil du oppdatere siden?')) {
          window.location.reload();
        }
      }
    }
    
    // If it's a token expired error, redirect to login
    if (error.response?.data?.code === 'TOKEN_EXPIRED') {
      console.error('🚫 API: Token expired, redirecting to login');
      window.location.href = '/login';
      throw new Error('Token expired - redirecting to login');
    }
    
    // If it's rate limiting after all retries
    if (isRateLimited && retryCount >= MAX_RETRIES) {
      console.error('🚫 API: Rate limited after all retries');
      throw new Error('API er midlertidig utilgjengelig. Vennligst vent et minutt og prøv igjen.');
    }
    
    throw error;
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API: Making request to ${config.url}`);
    
    // Use the global axios authorization header if available
    if (axios.defaults.headers.common['Authorization']) {
      config.headers.Authorization = axios.defaults.headers.common['Authorization'];
      console.log('🔐 API: Using global auth token');
    }
    
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
