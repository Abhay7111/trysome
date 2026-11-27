import axios from 'axios';
import { API_BASE_URL } from './api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export async function createPost(caption, image, visibility = 'public') {
  const formData = new FormData();
  formData.append('caption', caption);
  formData.append('visibility', visibility);
  if (image) {
    formData.append('image', image);
  }

  const response = await api.post('/post/tweet', formData);
  return response.data;
}

export async function fetchFeedPosts() {
  const response = await api.get('/post/feed');
  return response.data;
}

export async function fetchMyPosts() {
  const response = await api.get('/post/mine');
  return response.data;
}

export async function fetchPostInteractions() {
  const response = await api.get('/post/interactions');
  return response.data;
}

export async function toggleLike(postId) {
  const response = await api.post(`/post/${postId}/like`);
  return response.data;
}

export async function toggleSave(postId) {
  const response = await api.post(`/post/${postId}/save`);
  return response.data;
}

export async function addComment(postId, text) {
  const response = await api.post(`/post/${postId}/comments`, { text });
  return response.data;
}

export async function updatePost(postId, updates) {
  const response = await api.patch(`/post/${postId}`, updates);
  return response.data;
}

export async function deletePost(postId) {
  const response = await api.delete(`/post/${postId}`);
  return response.data;
}
