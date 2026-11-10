import { reactive } from 'vue';
import { apiRequest } from '../api/client';

export const authState = reactive({
  user: null,
  token: localStorage.getItem('meeting_room_token') || '',
  loading: false,
});

export const authStore = {
  get user() {
    return authState.user;
  },
  get token() {
    return authState.token;
  },
  async login(username, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    authState.token = data.token;
    authState.user = data.user;
    localStorage.setItem('meeting_room_token', data.token);
    return data;
  },
  async fetchMe() {
    if (!authState.token) return null;
    try {
      const data = await apiRequest('/api/auth/me');
      authState.user = data.user;
      return data.user;
    } catch {
      this.logout();
      return null;
    }
  },
  logout() {
    authState.user = null;
    authState.token = '';
    localStorage.removeItem('meeting_room_token');
  },
};

export function useAuthStore() {
  return authStore;
}
