import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/users',
  withCredentials: true,
});

export async function fetchPublicUserProfile(userId) {
  const response = await api.get(`/${userId}`);
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
