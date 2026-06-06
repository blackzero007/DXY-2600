const express = require('express');
const router = express.Router();
const { getAllInspections, createInspection, getExhibitById, getTodayInspectionStats, getInspectorWorkloadStats } = require('../database');

function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDateCN(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

router.get('/export', async (req, res) => {
  const { zone, status, sortBy, sortOrder } = req.query;
  try {
    const inspections = await getAllInspections(zone, status, sortBy, sortOrder);
    
    const headers = ['展品名称', '展区', '巡检员', '状态', '备注', '巡检时间'];
    
    const rows = inspections.map(record => [
      record.exhibit_name,
      record.exhibit_zone,
      record.inspector,
      record.status === 'normal' ? '正常' : '异常',
      record.remarks || '',
      formatDateCN(record.created_at)
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(','))
      .join('\r\n');
    
    const BOM = '\uFEFF';
    const filename = `巡检历史_${new Date().toISOString().slice(0, 10)}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(BOM + csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/today', async (req, res) => {
  try {
    const stats = await getTodayInspectionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/inspectors', async (req, res) => {
  try {
    const stats = await getInspectorWorkloadStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const { zone, status, sortBy, sortOrder } = req.query;
  try {
    const inspections = await getAllInspections(zone, status, sortBy, sortOrder);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { exhibit_id, inspector, status, remarks } = req.body;

  if (!exhibit_id || !inspector || !status) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (!['normal', 'abnormal'].includes(status)) {
    return res.status(400).json({ error: '状态值无效' });
  }

  if (status === 'abnormal') {
    if (typeof remarks !== 'string' || !remarks.trim()) {
      return res.status(400).json({ error: '异常状态下备注为必填项' });
    }
  }

  try {
    const exhibit = await getExhibitById(exhibit_id);
    if (!exhibit) {
      return res.status(404).json({ error: '展品不存在' });
    }

    const safeRemarks = typeof remarks === 'string' ? remarks : '';
    const id = await createInspection(exhibit_id, inspector, status, safeRemarks);
    res.status(201).json({ id, message: '巡检记录创建成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
