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

export function getInspectorWorkloadStats() {
  return request('/inspections/stats/inspectors');
}

export function getAbnormalExhibits() {
  return request('/exhibits/abnormal/list');
}

export function getZoneOverviewStats() {
  return request('/exhibits/stats/zones');
}

export function getOverdueExhibits(hours = 24, zone = null) {
  let url = `/exhibits/overdue/list?hours=${hours}`;
  if (zone) {
    url += `&zone=${encodeURIComponent(zone)}`;
  }
  return request(url);
}

export function createExhibit(data) {
  return request('/exhibits', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function exportInspections(zone = null) {
  let url = `${API_BASE}/inspections/export`;
  if (zone) {
    url += `?zone=${encodeURIComponent(zone)}`;
  }
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('导出失败');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      a.download = `巡检历史_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
}
