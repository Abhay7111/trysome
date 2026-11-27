import axios from 'axios';
import { API_BASE_URL } from './api.config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/users`,
  withCredentials: true,
});

export async function fetchPublicUserProfile(userId) {
  const response = await api.get(`/${userId}`);
  return response.data;
}

export async function fetchFollowers(userId) {
  const response = await api.get(`/${userId}/followers`);
  return response.data;
}

export async function fetchFollowing(userId) {
  const response = await api.get(`/${userId}/following`);
  return response.data;
}

export async function fetchProfileStats(userId) {
  const response = await api.get(`/${userId}/stats`);
  return response.data;
}

export async function toggleFollow(userId) {
  const response = await api.post(`/${userId}/follow`);
  return response.data;
}

export async function toggleBlock(userId) {
  const response = await api.post(`/${userId}/block`);
  return response.data;
}

export async function fetchFollowRequests() {
  const response = await api.get('/follow-requests');
  return response.data;
}

export async function respondToFollowRequest(userId, accept) {
  const response = await api.patch(`/follow-requests/${userId}`, { accept });
  return response.data;
}
