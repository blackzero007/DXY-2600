const express = require('express');
const router = express.Router();
const { getAllExhibits, getExhibitById, getExhibitInspections, getZones, getAbnormalExhibits, getZoneOverviewStats, createExhibit, getOverdueExhibits } = require('../database');

router.get('/', async (req, res) => {
  const { zone } = req.query;
  try {
    const exhibits = await getAllExhibits(zone);
    res.json(exhibits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { name, zone, description } = req.body;
  try {
    if (!name || !zone) {
      return res.status(400).json({ error: '展品名称和所属展区为必填项' });
    }
    const exhibit = await createExhibit(name, zone, description || '');
    res.status(201).json(exhibit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/zones', async (req, res) => {
  try {
    const zones = await getZones();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/zones', async (req, res) => {
  try {
    const stats = await getZoneOverviewStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/abnormal/list', async (req, res) => {
  try {
    const abnormalExhibits = await getAbnormalExhibits();
    res.json(abnormalExhibits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/overdue/list', async (req, res) => {
  try {
    const { hours, zone } = req.query;
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    const overdueExhibits = await getOverdueExhibits(hoursNum, zone || null);
    res.json(overdueExhibits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exhibit = await getExhibitById(id);
    if (!exhibit) {
      return res.status(404).json({ error: '展品不存在' });
    }
    res.json(exhibit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/inspections', async (req, res) => {
  const { id } = req.params;
  try {
    const exhibit = await getExhibitById(id);
    if (!exhibit) {
      return res.status(404).json({ error: '展品不存在' });
    }
    const inspections = await getExhibitInspections(id);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
