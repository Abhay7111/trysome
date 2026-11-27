import axios from 'axios';
import { API_BASE_URL } from './api.config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/chat`,
  withCredentials: true,
});

export async function fetchConversations() {
  const response = await api.get('/conversations');
  return response.data;
}

export async function createConversation(participantIds, groupName = '') {
  const response = await api.post('/conversations', { participantIds, groupName });
  return response.data;
}

export async function fetchMessages(conversationId) {
  const response = await api.get(`/conversations/${conversationId}/messages`);
  return response.data;
}

export async function sendMessage(conversationId, text, file) {
  const formData = new FormData();
  formData.append('text', text);
  if (file) formData.append('attachment', file);
  const response = await api.post(
    `/conversations/${conversationId}/messages`,
    formData
  );
  return response.data;
}

export async function markConversationRead(conversationId) {
  const response = await api.patch(`/conversations/${conversationId}/read`);
  return response.data;
}
