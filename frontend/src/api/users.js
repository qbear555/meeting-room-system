import { apiRequest } from './client';

export function fetchUsers() {
  return apiRequest('/api/users');
}
