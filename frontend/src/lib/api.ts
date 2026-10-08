const API_BASE = "/api/v1";

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include", // Essential for httpOnly cookies!
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  // Handle errors
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === "string" 
          ? errorJson.detail 
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Non-json response error
    }
    const error = new Error(errorDetail);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}
