import { apiRequest } from './client';

export function fetchMeetingRooms(all = false) {
  return apiRequest(`/api/meeting-rooms${all ? '?all=1' : ''}`);
}

export function fetchMeetingRoomStatuses() {
  return apiRequest('/api/meeting-rooms/status');
}

export function fetchMeetingBookings(params = {}) {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.start_date) q.set('start_date', params.start_date);
  if (params.end_date) q.set('end_date', params.end_date);
  if (params.room_id) q.set('room_id', params.room_id);
  if (params.my_only) q.set('my_only', '1');
  const qs = q.toString();
  return apiRequest(`/api/meeting-bookings${qs ? `?${qs}` : ''}`);
}

export function createMeetingBooking(data) {
  return apiRequest('/api/meeting-bookings', {
    method: 'POST',
    body: data,
  });
}

export function updateMeetingBooking(id, data) {
  return apiRequest(`/api/meeting-bookings/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export function cancelMeetingBooking(id) {
  return apiRequest(`/api/meeting-bookings/${id}`, {
    method: 'DELETE',
  });
}

export function fetchMeetingReminders() {
  return apiRequest('/api/meeting-bookings/reminders');
}
