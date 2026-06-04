const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'data.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let exhibits = [];
let inspections = [];
let nextExhibitId = 1;
let nextInspectionId = 1;

function loadData() {
  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      exhibits = data.exhibits || [];
      inspections = data.inspections || [];
      nextExhibitId = data.nextExhibitId || 1;
      nextInspectionId = data.nextInspectionId || 1;
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
    nextExhibitId,
    nextInspectionId
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

function getAllExhibits(zone = null) {
  let filtered = exhibits;
  if (zone) {
    filtered = exhibits.filter(e => e.zone === zone);
  }
  
  return Promise.resolve(filtered.map(exhibit => {
    const lastInspection = inspections
      .filter(i => i.exhibit_id === exhibit.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    return {
      ...exhibit,
      last_status: lastInspection ? lastInspection.status : null,
      last_inspected: lastInspection ? lastInspection.created_at : null
    };
  }));
}

function getExhibitById(id) {
  return Promise.resolve(exhibits.find(e => e.id === parseInt(id)));
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

function getAllInspections(zone = null) {
  let result = inspections
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(i => {
      const exhibit = exhibits.find(e => e.id === i.exhibit_id);
      return {
        ...i,
        exhibit_name: exhibit ? exhibit.name : '未知展品',
        exhibit_zone: exhibit ? exhibit.zone : '未知展区'
      };
    });
  
  if (zone) {
    result = result.filter(i => i.exhibit_zone === zone);
  }
  
  return Promise.resolve(result);
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
  }
  
  saveData();
  return Promise.resolve(id);
}

function getZones() {
  const zones = [...new Set(exhibits.map(e => e.zone))].sort();
  return Promise.resolve(zones);
}

module.exports = {
  initDatabase,
  getAllExhibits,
  getExhibitById,
  getExhibitInspections,
  getAllInspections,
  createInspection,
  getZones
};
