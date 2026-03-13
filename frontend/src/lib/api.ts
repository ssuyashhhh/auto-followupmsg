import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally: remove token, but do NOT redirect or propagate error object to Suspense/React.use
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      // Optionally, trigger a global auth state update here
      // Do NOT redirect or throw error object to Suspense/React.use
      // Instead, return a rejected Promise with a custom error message
      return Promise.reject({
        ...error,
        isAuthError: true,
        message: "Unauthorized. Please log in.",
      });
    }
    return Promise.reject(error);
  }
);

export default api;
