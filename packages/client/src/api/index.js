const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function getExhibits(zone = null) {
  const url = zone ? `/exhibits?zone=${encodeURIComponent(zone)}` : '/exhibits';
  return request(url);
}

export function getExhibitById(id) {
  return request(`/exhibits/${id}`);
}

export function getZones() {
  return request('/exhibits/zones');
}

export function getInspections(zone = null) {
  const url = zone ? `/inspections?zone=${encodeURIComponent(zone)}` : '/inspections';
  return request(url);
}

export function getExhibitInspections(exhibitId) {
  return request(`/exhibits/${exhibitId}/inspections`);
}

export function createInspection(data) {
  return request('/inspections', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getTodayInspectionStats() {
  return request('/inspections/stats/today');
}

export function getAbnormalExhibits() {
  return request('/exhibits/abnormal/list');
}
