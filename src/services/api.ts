const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");

  const baseUrl = String(API_BASE_URL || "").replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const finalUrl = `${baseUrl}${cleanEndpoint}`;

  console.log("API_BASE_URL:", API_BASE_URL);
  console.log("API Endpoint:", endpoint);
  console.log("Final API URL:", finalUrl);

  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let data: any = null;

  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error("API Error:", {
      status: response.status,
      statusText: response.statusText,
      url: finalUrl,
      data,
    });

    throw new Error(data?.message || data?.error || "Something went wrong");
  }

  return data as T;
}