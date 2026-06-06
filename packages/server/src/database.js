const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'data.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let exhibits = [];
let inspections = [];
let operationLogs = [];
let nextExhibitId = 1;
let nextInspectionId = 1;
let nextOperationLogId = 1;

function loadData() {
  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      exhibits = data.exhibits || [];
      inspections = data.inspections || [];
      operationLogs = data.operationLogs || [];
      nextExhibitId = data.nextExhibitId || 1;
      nextInspectionId = data.nextInspectionId || 1;
      nextOperationLogId = data.nextOperationLogId || 1;
    } catch (e) {
      console.error('加载数据失败，使用初始数据');
      seedData();
    }
  } else {
    seedData();
  }
}

function saveData() {
  const data = {
    exhibits,
    inspections,
    operationLogs,
    nextExhibitId,
    nextInspectionId,
    nextOperationLogId
  };
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function seedData() {
  exhibits = [
    { id: 1, name: '青铜方鼎', zone: '古代文明区', description: '商代晚期青铜器，重达200公斤', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: '青瓷莲花尊', zone: '古代文明区', description: '南北朝时期青瓷精品', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: '敦煌壁画复制品', zone: '艺术画廊', description: '莫高窟第257窟壁画临摹', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: '《清明上河图》仿真', zone: '艺术画廊', description: '北宋张择端名作仿真展示', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: '恐龙化石骨架', zone: '自然探索区', description: '侏罗纪时期霸王龙化石', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: '太空陨石样本', zone: '自然探索区', description: '1998年坠落于吉林的陨石', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: '兵马俑复制品', zone: '古代文明区', description: '秦始皇陵兵马俑一号坑复制品', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, name: '古生物标本', zone: '自然探索区', description: '寒武纪生物化石群', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, name: '名人字画真迹', zone: '艺术画廊', description: '明清两代名家书画作品', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 10, name: '甲骨文片', zone: '古代文明区', description: '商代晚期占卜用甲骨', status: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];

  inspections = [];
  const inspectors = ['张三', '李四', '王五', '赵六'];
  
  exhibits.forEach(exhibit => {
    const inspectionCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < inspectionCount; i++) {
      const status = Math.random() > 0.8 ? 'abnormal' : 'normal';
      const inspector = inspectors[Math.floor(Math.random() * inspectors.length)];
      const remarks = status === 'abnormal' ? '发现轻微损伤，需要修复' : '展品状态良好';
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 72));
      
      inspections.push({
        id: nextInspectionId++,
        exhibit_id: exhibit.id,
        inspector,
        status,
        remarks,
        created_at: date.toISOString()
      });

      if (i === inspectionCount - 1) {
        exhibit.status = status;
        exhibit.updated_at = date.toISOString();
      }
    }
  });

  nextExhibitId = exhibits.length + 1;
  saveData();
  console.log('初始化数据完成');
}

function initDatabase() {
  loadData();
  return Promise.resolve();
}

function getAllExhibits(zone = null, inspectionFilter = null) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let filtered = exhibits;
  if (zone) {
    filtered = filtered.filter(e => e.zone === zone);
  }

  const result = filtered.map(exhibit => {
    const lastInspection = inspections
      .filter(i => i.exhibit_id === exhibit.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    return {
      ...exhibit,
      last_status: lastInspection ? lastInspection.status : null,
      last_inspected: lastInspection ? lastInspection.created_at : null,
      last_remarks: lastInspection ? lastInspection.remarks : null
    };
  });

  if (inspectionFilter) {
    switch (inspectionFilter) {
      case 'never':
        return Promise.resolve(result.filter(e => !e.last_inspected));
      case 'within_24h':
        return Promise.resolve(result.filter(e => e.last_inspected && new Date(e.last_inspected) >= twentyFourHoursAgo));
      case 'overdue_24h':
        return Promise.resolve(result.filter(e => !e.last_inspected || new Date(e.last_inspected) < twentyFourHoursAgo));
      default:
        break;
    }
  }

  return Promise.resolve(result);
}

function getExhibitById(id) {
  const exhibit = exhibits.find(e => e.id === parseInt(id));
  if (!exhibit) return Promise.resolve(null);
  
  const lastInspection = inspections
    .filter(i => i.exhibit_id === parseInt(id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  
  return Promise.resolve({
    ...exhibit,
    last_status: lastInspection ? lastInspection.status : null,
    last_inspected: lastInspection ? lastInspection.created_at : null,
    last_inspector: lastInspection ? lastInspection.inspector : null,
    last_remarks: lastInspection ? lastInspection.remarks : null
  });
}

function getExhibitInspections(exhibitId) {
  const exhibit = exhibits.find(e => e.id === parseInt(exhibitId));
  if (!exhibit) return Promise.resolve(null);
  
  const result = inspections
    .filter(i => i.exhibit_id === parseInt(exhibitId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(i => ({
      ...i,
      exhibit_name: exhibit.name,
      exhibit_zone: exhibit.zone
    }));
  
  return Promise.resolve(result);
}

function getAllInspections(zone = null, status = null, sortBy = 'created_at', sortOrder = 'desc', remarksKeyword = null) {
  function safeString(value) {
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
    return String(value);
  }

  const safeZone = safeString(zone);
  const safeStatus = safeString(status);
  const safeSortBy = safeString(sortBy) || 'created_at';
  const safeSortOrder = safeString(sortOrder) || 'desc';
  const safeRemarksKeyword = safeString(remarksKeyword);

  let result = inspections.map(i => {
    const exhibit = exhibits.find(e => e.id === i.exhibit_id);
    return {
      ...i,
      exhibit_name: exhibit ? exhibit.name : '未知展品',
      exhibit_zone: exhibit ? exhibit.zone : '未知展区'
    };
  });

  if (safeZone) {
    result = result.filter(i => i.exhibit_zone === safeZone);
  }

  if (safeStatus) {
    result = result.filter(i => i.status === safeStatus);
  }

  if (safeRemarksKeyword && safeRemarksKeyword.trim()) {
    const keyword = safeRemarksKeyword.trim().toLowerCase();
    result = result.filter(i => {
      const remarks = (i.remarks || '').toLowerCase();
      return remarks.includes(keyword);
    });
  }

  const sortableFields = ['created_at', 'exhibit_name', 'exhibit_zone', 'inspector', 'status'];
  const validSortBy = sortableFields.includes(safeSortBy) ? safeSortBy : 'created_at';
  const validSortOrder = safeSortOrder === 'asc' ? 'asc' : 'desc';

  result.sort((a, b) => {
    let comparison = 0;
    if (validSortBy === 'created_at') {
      comparison = new Date(a.created_at) - new Date(b.created_at);
    } else {
      const aVal = a[validSortBy] || '';
      const bVal = b[validSortBy] || '';
      comparison = String(aVal).localeCompare(String(bVal), 'zh-CN');
    }
    return validSortOrder === 'asc' ? comparison : -comparison;
  });

  return Promise.resolve(result);
}

function createOperationLog(type, objectName, details = {}) {
  const id = nextOperationLogId++;
  const now = new Date().toISOString();
  
  const log = {
    id,
    type,
    object_name: objectName,
    details,
    created_at: now
  };
  
  operationLogs.unshift(log);
  saveData();
  return Promise.resolve(log);
}

function createExhibit(name, zone, description) {
  const id = nextExhibitId++;
  const now = new Date().toISOString();
  
  const exhibit = {
    id,
    name,
    zone,
    description,
    status: 'normal',
    created_at: now,
    updated_at: now
  };
  
  exhibits.push(exhibit);
  createOperationLog('create_exhibit', name, { zone, description });
  saveData();
  return Promise.resolve(exhibit);
}

function createInspection(exhibitId, inspector, status, remarks) {
  const id = nextInspectionId++;
  const now = new Date().toISOString();
  
  const inspection = {
    id,
    exhibit_id: parseInt(exhibitId),
    inspector,
    status,
    remarks,
    created_at: now
  };
  
  inspections.push(inspection);
  
  const exhibit = exhibits.find(e => e.id === parseInt(exhibitId));
  if (exhibit) {
    exhibit.status = status;
    exhibit.updated_at = now;
    createOperationLog('create_inspection', exhibit.name, { inspector, status, remarks });
  }
  
  saveData();
  return Promise.resolve(id);
}

function getAbnormalExhibits() {
  const abnormalExhibits = exhibits
    .filter(exhibit => {
      const lastInspection = inspections
        .filter(i => i.exhibit_id === exhibit.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return lastInspection && lastInspection.status === 'abnormal';
    })
    .map(exhibit => {
      const lastInspection = inspections
        .filter(i => i.exhibit_id === exhibit.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return {
        id: exhibit.id,
        name: exhibit.name,
        zone: exhibit.zone,
        description: exhibit.description,
        abnormal_remarks: lastInspection.remarks,
        abnormal_time: lastInspection.created_at,
        inspector: lastInspection.inspector
      };
    })
    .sort((a, b) => new Date(b.abnormal_time) - new Date(a.abnormal_time));

  return Promise.resolve(abnormalExhibits);
}

function getZones() {
  const zones = [...new Set(exhibits.map(e => e.zone))].sort();
  return Promise.resolve(zones);
}

function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function getTodayInspectionStats() {
  const todayInspections = inspections.filter(i => isToday(i.created_at));
  const todayInspectedExhibitIds = [...new Set(todayInspections.map(i => i.exhibit_id))];
  const inspectedCount = todayInspectedExhibitIds.length;
  const abnormalCount = todayInspections.filter(i => i.status === 'abnormal').length;
  const uninspectedCount = exhibits.length - inspectedCount;

  const zoneStats = {};
  const zones = [...new Set(exhibits.map(e => e.zone))];

  zones.forEach(zone => {
    const zoneExhibits = exhibits.filter(e => e.zone === zone);
    const zoneInspectedIds = todayInspectedExhibitIds.filter(id =>
      zoneExhibits.some(e => e.id === id)
    );
    zoneStats[zone] = {
      total: zoneExhibits.length,
      inspected: zoneInspectedIds.length,
      uninspected: zoneExhibits.length - zoneInspectedIds.length,
      completionRate: zoneExhibits.length > 0
        ? Math.round((zoneInspectedIds.length / zoneExhibits.length) * 100)
        : 0
    };
  });

  return Promise.resolve({
    totalExhibits: exhibits.length,
    inspectedCount,
    abnormalCount,
    uninspectedCount,
    completionRate: exhibits.length > 0
      ? Math.round((inspectedCount / exhibits.length) * 100)
      : 0,
    zoneStats
  });
}

function getInspectorWorkloadStats() {
  const inspectorMap = new Map();

  inspections.forEach(inspection => {
    const { inspector, status, created_at } = inspection;

    if (!inspectorMap.has(inspector)) {
      inspectorMap.set(inspector, {
        inspector,
        totalCount: 0,
        abnormalCount: 0,
        lastInspectionTime: null
      });
    }

    const stats = inspectorMap.get(inspector);
    stats.totalCount++;

    if (status === 'abnormal') {
      stats.abnormalCount++;
    }

    if (!stats.lastInspectionTime || new Date(created_at) > new Date(stats.lastInspectionTime)) {
      stats.lastInspectionTime = created_at;
    }
  });

  const result = [...inspectorMap.values()].sort((a, b) => b.totalCount - a.totalCount);

  return Promise.resolve(result);
}

function getZoneOverviewStats() {
  const zones = [...new Set(exhibits.map(e => e.zone))].sort();
  const zoneStats = [];

  zones.forEach(zone => {
    const zoneExhibits = exhibits.filter(e => e.zone === zone);
    const totalCount = zoneExhibits.length;

    let normalCount = 0;
    let abnormalCount = 0;
    let pendingCount = 0;

    zoneExhibits.forEach(exhibit => {
      const lastInspection = inspections
        .filter(i => i.exhibit_id === exhibit.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (!lastInspection) {
        pendingCount++;
      } else if (lastInspection.status === 'normal') {
        normalCount++;
      } else if (lastInspection.status === 'abnormal') {
        abnormalCount++;
      }
    });

    zoneStats.push({
      zone,
      totalCount,
      normalCount,
      abnormalCount,
      pendingCount,
      normalRate: totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0
    });
  });

  const overallStats = {
    totalCount: exhibits.length,
    normalCount: zoneStats.reduce((sum, z) => sum + z.normalCount, 0),
    abnormalCount: zoneStats.reduce((sum, z) => sum + z.abnormalCount, 0),
    pendingCount: zoneStats.reduce((sum, z) => sum + z.pendingCount, 0)
  };
  overallStats.normalRate = overallStats.totalCount > 0
    ? Math.round((overallStats.normalCount / overallStats.totalCount) * 100)
    : 0;

  return Promise.resolve({
    overall: overallStats,
    zones: zoneStats
  });
}

function getOverdueExhibits(hours = 24, zone = null) {
  const now = new Date();
  const overdueTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const overdueExhibits = exhibits
    .filter(exhibit => {
      if (zone && exhibit.zone !== zone) {
        return false;
      }
      const lastInspection = inspections
        .filter(i => i.exhibit_id === exhibit.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (!lastInspection) {
        return true;
      }
      return new Date(lastInspection.created_at) < overdueTime;
    })
    .map(exhibit => {
      const lastInspection = inspections
        .filter(i => i.exhibit_id === exhibit.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      let hoursSinceLast = null;
      if (lastInspection) {
        const diffMs = now - new Date(lastInspection.created_at);
        hoursSinceLast = Math.floor(diffMs / (1000 * 60 * 60));
      }

      return {
        id: exhibit.id,
        name: exhibit.name,
        zone: exhibit.zone,
        description: exhibit.description,
        last_status: lastInspection ? lastInspection.status : null,
        last_inspected: lastInspection ? lastInspection.created_at : null,
        last_inspector: lastInspection ? lastInspection.inspector : null,
        hours_since_last: hoursSinceLast,
        is_never_inspected: !lastInspection
      };
    })
    .sort((a, b) => {
      if (a.is_never_inspected && !b.is_never_inspected) return -1;
      if (!a.is_never_inspected && b.is_never_inspected) return 1;
      if (a.is_never_inspected && b.is_never_inspected) return 0;
      return b.hours_since_last - a.hours_since_last;
    });

  return Promise.resolve(overdueExhibits);
}

function getOperationLogs(type = null, limit = null) {
  let result = [...operationLogs];
  
  if (type) {
    result = result.filter(log => log.type === type);
  }
  
  if (limit) {
    result = result.slice(0, limit);
  }
  
  return Promise.resolve(result);
}

module.exports = {
  initDatabase,
  getAllExhibits,
  getExhibitById,
  getExhibitInspections,
  getAllInspections,
  createExhibit,
  createInspection,
  getZones,
  getTodayInspectionStats,
  getAbnormalExhibits,
  getInspectorWorkloadStats,
  getZoneOverviewStats,
  getOverdueExhibits,
  getOperationLogs,
  createOperationLog
};
