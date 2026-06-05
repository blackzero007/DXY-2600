const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const exhibitsRouter = require('./routes/exhibits');
const inspectionsRouter = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await initDatabase();

    app.use(cors());
    app.use(morgan('dev'));
    app.use(express.json());

    app.use('/api/exhibits', exhibitsRouter);
    app.use('/api/inspections', inspectionsRouter);

    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: '服务器内部错误' });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 展品巡检系统后端服务已启动`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`📚 API 文档:`);
    console.log(`   GET  /api/exhibits           - 获取展品列表`);
    console.log(`   GET  /api/exhibits/zones     - 获取所有展区`);
    console.log(`   GET  /api/exhibits/abnormal/list - 获取异常展品列表`);
    console.log(`   GET  /api/exhibits/:id       - 获取展品详情`);
    console.log(`   POST /api/inspections        - 创建巡检记录`);
    console.log(`   GET  /api/inspections        - 获取所有巡检记录`);
    console.log(`   GET  /api/inspections/stats/today - 获取今日巡检统计`);
    console.log(`   GET  /api/inspections/stats/inspectors - 获取巡检员工作量统计\n`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
})();
