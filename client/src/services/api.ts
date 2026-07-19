import axios from "axios";

// Dynamically select the backend API URL based on build target
const API_BASE_URL = import.meta.env.PROD
    ? "https://leetcode-revision-tracker-api.onrender.com/api" // Render API service domain
    : "http://localhost:5000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Crucial for HTTP-only cookies
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
