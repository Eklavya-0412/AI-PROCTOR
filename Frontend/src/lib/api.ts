const BASE_URL = 'https://localhost:4000/api';

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    credentials: 'include', // <-- CRITICAL: Sends the HttpOnly cookie to Go
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },  
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    
    return null as unknown as T;

  } catch (error) {
    console.error(`[API Client] Request failed for ${endpoint}:`, error);
    throw error;
  }
}