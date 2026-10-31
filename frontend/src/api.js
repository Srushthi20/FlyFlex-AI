
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080/api",
  timeout: 30000
});

// Automatically attach the login token.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("flyflex_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Existing APIs
export const getHealth = () => api.get("/health");

export const searchFlights = (params) =>
  api.get("/flights/search", { params });

export const getRecommendations = (payload) =>
  api.post("/recommendations", payload);

export const confirmReschedule = (payload) =>
  api.post("/rescheduling/confirm", payload);

export const getHistory = () =>
  api.get("/rescheduling/history");

// AI APIs
export const predictFlightDelay = (payload) =>
  api.post("/ai/predict-delay", payload);

export const matchFlightsWithAI = (payload) =>
  api.post("/ai/match-flights", payload);
export const confirmDemoPayment = (id) =>
  api.post(`/rescheduling/${id}/payment`);

export const submitDemoRefund = (id) =>
  api.post(`/rescheduling/${id}/refund`);

export default api;
