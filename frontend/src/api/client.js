import axios from "axios";

function getDefaultApiUrl() {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api";
  }

  return "http://localhost:5000/api";
}

function getDefaultSocketUrl() {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "";
  }

  return "http://localhost:5000";
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || getDefaultApiUrl()
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

  const socketUrl = import.meta.env.VITE_SOCKET_URL || getDefaultSocketUrl();
  return `${socketUrl}${relativeUrl}`;
}
