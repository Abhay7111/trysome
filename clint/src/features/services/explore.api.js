import axios from 'axios';
import { API_BASE_URL } from './api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export async function searchExplore(type, query) {
  const response = await api.get('/explore/search', {
    params: { type, q: query },
  });
  return response.data;
}

export async function fetchHomeHighlights() {
  const response = await api.get('/explore/highlights');
  return response.data;
}
