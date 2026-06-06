const assert = require('assert');
const { initDatabase, getAllExhibits } = require('../src/database');

async function runTests() {
  console.log('\n🧪 运行展品巡检状态筛选功能测试\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      initDatabase();
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${name}\n     错误: ${error.message}`);
      failed++;
    }
  }

  await test('getAllExhibits 无筛选参数时返回全部展品', async () => {
    const all = await getAllExhibits();
    assert(all.length > 0, '应该返回展品数据');
  });

  await test('getAllExhibits 支持 never 筛选（未巡检）', async () => {
    const neverInspected = await getAllExhibits(null, 'never');
    neverInspected.forEach(exhibit => {
      assert.strictEqual(exhibit.last_inspected, null, '未巡检展品的 last_inspected 应为 null');
    });
  });

  await test('getAllExhibits 支持 within_24h 筛选（24小时内巡检）', async () => {
    const within24h = await getAllExhibits(null, 'within_24h');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    within24h.forEach(exhibit => {
      assert(exhibit.last_inspected !== null, '24小时内巡检展品应有 last_inspected');
      assert(new Date(exhibit.last_inspected) >= twentyFourHoursAgo, '巡检时间应在24小时内');
    });
  });

  await test('getAllExhibits 支持 overdue_24h 筛选（超过24小时未巡检）', async () => {
    const overdue24h = await getAllExhibits(null, 'overdue_24h');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    overdue24h.forEach(exhibit => {
      const isOverdue = !exhibit.last_inspected || new Date(exhibit.last_inspected) < twentyFourHoursAgo;
      assert(isOverdue, '展品应满足超过24小时未巡检条件');
    });
  });

  await test('三种筛选结果数量之和应等于总数', async () => {
    const all = await getAllExhibits();
    const never = await getAllExhibits(null, 'never');
    const within24h = await getAllExhibits(null, 'within_24h');
    const overdue24h = await getAllExhibits(null, 'overdue_24h');
    
    assert.strictEqual(
      never.length + within24h.length + overdue24h.filter(e => e.last_inspected).length,
      all.length,
      '未巡检 + 24小时内 + 24小时外（已巡检） = 总数'
    );
  });

  await test('筛选与展区筛选可以组合使用', async () => {
    const zones = ['古代文明区', '艺术画廊', '自然探索区'];
    for (const zone of zones) {
      const filtered = await getAllExhibits(zone, 'overdue_24h');
      filtered.forEach(exhibit => {
        assert.strictEqual(exhibit.zone, zone, `展区筛选结果应属于 ${zone}`);
      });
    }
  });

  await test('无效的筛选值返回全部数据', async () => {
    const all = await getAllExhibits(null, 'invalid_value');
    const allWithoutFilter = await getAllExhibits();
    assert.strictEqual(all.length, allWithoutFilter.length, '无效筛选值应返回全部数据');
  });

  console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
