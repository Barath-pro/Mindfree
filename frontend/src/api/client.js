import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mindfree_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const apiClient = api;

export function resolveAssetUrl(relativeUrl) {
  if (!relativeUrl) {
    return "";
  }

  if (relativeUrl.startsWith("http")) {
    return relativeUrl;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
  return `${socketUrl}${relativeUrl}`;
}

