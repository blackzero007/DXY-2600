const express = require('express');
const router = express.Router();
const { getOperationLogs } = require('../database');

const typeLabels = {
  create_exhibit: '新增展品',
  create_inspection: '提交巡检记录'
};

router.get('/', async (req, res) => {
  const { type, limit } = req.query;
  try {
    const logs = await getOperationLogs(type || null, limit ? parseInt(limit, 10) : null);
    const result = logs.map(log => ({
      ...log,
      type_label: typeLabels[log.type] || log.type
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
