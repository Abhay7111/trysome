import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
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
