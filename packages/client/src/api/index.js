const API_BASE = '/api';

function safeTrim(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item !== null && item !== undefined) {
        const str = String(item).trim();
        if (str.length > 0) {
          return str;
        }
      }
    }
    return null;
  }
  return String(value).trim();
}

function getErrorType(status) {
  if (status >= 400 && status < 500) {
    if (status === 404) return 'not_found';
    if (status === 400 || status === 422) return 'validation';
    if (status === 401 || status === 403) return 'auth';
    return 'client';
  }
  if (status >= 500) return 'server';
  return 'unknown';
}

function getUserFriendlyMessage(status, type, serverMessage) {
  if (serverMessage) {
    return serverMessage;
  }
  switch (type) {
    case 'not_found':
      return '请求的资源不存在';
    case 'validation':
      return '请求参数有误';
    case 'auth':
      return '请先登录后再操作';
    case 'server':
      return '服务器繁忙，请稍后重试';
    case 'network':
      return '网络连接失败，请检查网络';
    default:
      return '请求失败，请稍后重试';
  }
}

class ApiError extends Error {
  constructor({ message, status, type, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.details = details || null;
  }
}

async function request(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (options.signal && options.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!response.ok) {
      let errorData = { error: null };
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP错误 (${response.status})` };
      }
      const type = getErrorType(response.status);
      const message = getUserFriendlyMessage(response.status, type, errorData.error);
      throw new ApiError({
        message,
        status: response.status,
        type,
        details: errorData.details || null
      });
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error.name === 'ApiError') {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError({
        message: '网络连接失败，请检查网络设置',
        status: 0,
        type: 'network',
        details: error.message
      });
    }
    throw new ApiError({
      message: error.message || '请求失败',
      status: 0,
      type: 'unknown',
      details: error.message
    });
  }
}

export function getExhibits(zone = null, inspectionFilter = null) {
  const params = [];
  if (zone) {
    params.push(`zone=${encodeURIComponent(zone)}`);
  }
  if (inspectionFilter) {
    params.push(`inspectionFilter=${encodeURIComponent(inspectionFilter)}`);
  }
  const url = params.length > 0 ? `/exhibits?${params.join('&')}` : '/exhibits';
  return request(url);
}

export function getExhibitById(id) {
  return request(`/exhibits/${id}`);
}

export function getZones() {
  return request('/exhibits/zones');
}

export function getInspections(zone = null, status = null, sortBy = 'created_at', sortOrder = 'desc', remarksKeyword = null, signal = null) {
  const params = [];
  if (zone) {
    params.push(`zone=${encodeURIComponent(zone)}`);
  }
  if (status) {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  if (sortBy) {
    params.push(`sortBy=${encodeURIComponent(sortBy)}`);
  }
  if (sortOrder) {
    params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
  }
  const safeKeyword = safeTrim(remarksKeyword);
  if (safeKeyword) {
    params.push(`remarksKeyword=${encodeURIComponent(safeKeyword)}`);
  }
  const url = params.length > 0 ? `/inspections?${params.join('&')}` : '/inspections';
  const options = signal ? { signal } : {};
  return request(url, options);
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

export function exportInspections(zone = null, status = null, sortBy = 'created_at', sortOrder = 'desc', remarksKeyword = null) {
  const params = [];
  if (zone) {
    params.push(`zone=${encodeURIComponent(zone)}`);
  }
  if (status) {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  if (sortBy) {
    params.push(`sortBy=${encodeURIComponent(sortBy)}`);
  }
  if (sortOrder) {
    params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
  }
  const safeKeyword = safeTrim(remarksKeyword);
  if (safeKeyword) {
    params.push(`remarksKeyword=${encodeURIComponent(safeKeyword)}`);
  }
  let url = `${API_BASE}/inspections/export`;
  if (params.length > 0) {
    url += `?${params.join('&')}`;
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

export function getOperationLogs(type = null, limit = null) {
  let url = '/logs';
  const params = [];
  if (type) {
    params.push(`type=${encodeURIComponent(type)}`);
  }
  if (limit) {
    params.push(`limit=${limit}`);
  }
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  return request(url);
}
