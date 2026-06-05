const express = require('express');
const router = express.Router();
const { getAllInspections, createInspection, getExhibitById, getTodayInspectionStats, getInspectorWorkloadStats } = require('../database');

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
  const { zone } = req.query;
  try {
    const inspections = await getAllInspections(zone);
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

  try {
    const exhibit = await getExhibitById(exhibit_id);
    if (!exhibit) {
      return res.status(404).json({ error: '展品不存在' });
    }

    const id = await createInspection(exhibit_id, inspector, status, remarks || '');
    res.status(201).json({ id, message: '巡检记录创建成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
