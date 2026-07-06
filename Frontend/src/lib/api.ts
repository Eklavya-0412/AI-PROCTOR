const BASE_URL = 'http://localhost:4000/api';
export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const storedUser = localStorage.getItem('mock_user');
    const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
    if (storedUser) {
        try {
        const parsedUser = JSON.parse(storedUser);
        headers['X-Mock-User-ID'] = parsedUser.id;
        headers['X-Mock-Role'] = parsedUser.role;
        } 
        catch (e) {
        console.error("Failed to parse mock_user from localStorage", e);
        }
    }
    const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
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

  } 
  catch (error) {
    console.error(`[API Client] Request failed for ${endpoint}:`, error);
    throw error;
  }
}
