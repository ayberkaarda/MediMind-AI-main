import axios from 'axios';

const API_BASE_URL = "http://127.0.0.1:8000";

export const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
};

export const predictDisease = async (symptoms) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/predict`, { symptoms });
        return response.data;
    } catch (error) {
        console.error("Prediction Error:", error);
        return null;
    }
}
