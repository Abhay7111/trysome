import axios from 'axios';
import { API_BASE_URL } from './api.config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/notifications`,
  withCredentials: true,
});

export async function fetchNotifications() {
  const response = await api.get('/');
  return response.data;
}

export async function fetchUnreadNotificationCount() {
  const response = await api.get('/unread-count');
  return response.data;
}

export async function markNotificationsRead() {
  const response = await api.patch('/read');
  return response.data;
}
