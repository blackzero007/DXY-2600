const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testDataDir = path.join(__dirname, '..', 'test-data');
let testCount = 0;
let passed = 0;
let failed = 0;

function setupTestEnvironment() {
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDataDir, { recursive: true });
  process.env.DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../src/database')];
}

function cleanupTestEnvironment() {
  try {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore cleanup errors
  }
}

async function runTest(name, testFn) {
  testCount++;
  setupTestEnvironment();
  try {
    await testFn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     错误: ${error.message}`);
    failed++;
  } finally {
    cleanupTestEnvironment();
  }
}

async function runTests() {
  console.log('\n🧪 运行后端数据库模块测试\n');

  await runTest('数据库初始化后存在展品数据', async () => {
    const { initDatabase, getAllExhibits } = require('../src/database');
    await initDatabase();
    const exhibits = await getAllExhibits();
    assert.ok(exhibits.length > 0, '展品列表不应为空');
  });

  await runTest('getExhibitById 返回展品的完整详情信息（含最近巡检信息）', async () => {
    const { initDatabase, getExhibitById } = require('../src/database');
    await initDatabase();
    const exhibit = await getExhibitById(1);
    assert.ok(exhibit, '应返回展品数据');
    assert.strictEqual(exhibit.id, 1);
    assert.ok('name' in exhibit, '应包含 name 字段');
    assert.ok('zone' in exhibit, '应包含 zone 字段');
    assert.ok('description' in exhibit, '应包含 description 字段');
    assert.ok('last_status' in exhibit, '应包含 last_status 字段（最近巡检状态）');
    assert.ok('last_inspected' in exhibit, '应包含 last_inspected 字段（最近巡检时间）');
    assert.ok('last_inspector' in exhibit, '应包含 last_inspector 字段（最近巡检员）');
    assert.ok('last_remarks' in exhibit, '应包含 last_remarks 字段（最近巡检备注）');
  });

  await runTest('getExhibitById 返回的最近巡检状态为 normal 或 abnormal', async () => {
    const { initDatabase, getExhibitById } = require('../src/database');
    await initDatabase();
    const exhibit = await getExhibitById(1);
    assert.ok(
      ['normal', 'abnormal'].includes(exhibit.last_status),
      'last_status 应为 normal 或 abnormal'
    );
  });

  await runTest('getExhibitById 对不存在的展品返回 null', async () => {
    const { initDatabase, getExhibitById } = require('../src/database');
    await initDatabase();
    const exhibit = await getExhibitById(9999);
    assert.strictEqual(exhibit, null, '不存在的展品应返回 null');
  });

  await runTest('创建巡检后 getExhibitById 返回更新后的最近巡检信息', async () => {
    const { initDatabase, getExhibitById, createInspection } = require('../src/database');
    await initDatabase();
    await createInspection(1, '测试员', 'abnormal', '测试备注内容');
    const exhibit = await getExhibitById(1);
    assert.strictEqual(exhibit.last_status, 'abnormal', '最近状态应为 abnormal');
    assert.strictEqual(exhibit.last_inspector, '测试员', '最近巡检员应为 测试员');
    assert.strictEqual(exhibit.last_remarks, '测试备注内容', '最近备注应为 测试备注内容');
    assert.ok(exhibit.last_inspected, '最近巡检时间不应为空');
  });

  await runTest('getOverdueExhibits 返回超过指定小时数未巡检的展品', async () => {
    const { initDatabase, getOverdueExhibits } = require('../src/database');
    await initDatabase();
    const overdue24h = await getOverdueExhibits(24);
    assert.ok(Array.isArray(overdue24h), '应返回数组');
    assert.ok(overdue24h.length > 0, '24小时未巡检的展品不应为空（初始数据包含72小时内随机巡检）');

    const overdue72h = await getOverdueExhibits(72);
    assert.ok(Array.isArray(overdue72h), '应返回数组');
    assert.ok(overdue72h.length <= overdue24h.length, '72小时未巡检的展品数量应小于等于24小时的');
  });

  await runTest('getOverdueExhibits 返回数据包含必要字段', async () => {
    const { initDatabase, getOverdueExhibits } = require('../src/database');
    await initDatabase();
    const overdue = await getOverdueExhibits(24);
    if (overdue.length > 0) {
      const item = overdue[0];
      assert.ok('id' in item, '应包含 id 字段');
      assert.ok('name' in item, '应包含 name 字段');
      assert.ok('zone' in item, '应包含 zone 字段');
      assert.ok('hours_since_last' in item, '应包含 hours_since_last 字段');
      assert.ok('is_never_inspected' in item, '应包含 is_never_inspected 字段');
    }
  });

  await runTest('getOverdueExhibits 支持按展区筛选', async () => {
    const { initDatabase, getOverdueExhibits, getZones } = require('../src/database');
    await initDatabase();
    const zones = await getZones();
    assert.ok(zones.length > 0, '至少有一个展区');

    const allOverdue = await getOverdueExhibits(24);
    const zoneOverdue = await getOverdueExhibits(24, zones[0]);
    assert.ok(Array.isArray(zoneOverdue), '按展区筛选应返回数组');
    assert.ok(zoneOverdue.length <= allOverdue.length, '单个展区的超时展品数量不应超过全部展区');
    zoneOverdue.forEach(item => {
      assert.strictEqual(item.zone, zones[0], '筛选结果应属于指定展区');
    });
  });

  await runTest('【BUG修复验证】createExhibit 后 getOverdueExhibits 应包含新增展品', async () => {
    const { initDatabase, createExhibit, getOverdueExhibits } = require('../src/database');
    await initDatabase();

    const beforeCount = (await getOverdueExhibits(1)).length;

    const newExhibit = await createExhibit('新增测试展品', '古代文明区', '测试描述');
    assert.ok(newExhibit, '展品应创建成功');

    const afterOverdue = await getOverdueExhibits(1);
    const afterCount = afterOverdue.length;

    assert.strictEqual(afterCount, beforeCount + 1, '新增展品后超时未巡检列表数量应增加1');

    const found = afterOverdue.find(e => e.id === newExhibit.id);
    assert.ok(found, '新增的展品应出现在超时未巡检列表中');
    assert.strictEqual(found.is_never_inspected, true, '新增展品从未巡检，is_never_inspected 应为 true');
    assert.strictEqual(found.name, '新增测试展品', '展品名称应正确');
    assert.strictEqual(found.zone, '古代文明区', '展区应正确');
  });

  await runTest('从未巡检的展品在 getOverdueExhibits 中优先排序', async () => {
    const { initDatabase, createExhibit, getOverdueExhibits } = require('../src/database');
    await initDatabase();

    await createExhibit('从未巡检展品A', '测试区', '测试');
    await createExhibit('从未巡检展品B', '测试区', '测试');

    const overdue = await getOverdueExhibits(1);
    let foundInspected = false;

    for (let i = 0; i < overdue.length; i++) {
      if (!overdue[i].is_never_inspected) {
        foundInspected = true;
      } else if (foundInspected) {
        assert.fail('从未巡检的展品应排在已巡检但超时的展品前面，不应出现在已巡检展品之后');
      }
    }

    const neverInspectedCount = overdue.filter(e => e.is_never_inspected).length;
    assert.ok(neverInspectedCount >= 2, '至少应有 2 个从未巡检的展品');
  });

  await runTest('【BUG修复验证】getAllInspections 接收数组类型 remarksKeyword 不应崩溃（重复参数场景）', async () => {
    const { initDatabase, getAllInspections, createInspection } = require('../src/database');
    await initDatabase();

    await createInspection(1, '测试员', 'abnormal', '发现轻微损伤，需要修复');
    await createInspection(2, '测试员', 'normal', '展品状态良好');

    const arrayKeyword = ['损伤', '修复'];
    const result = await getAllInspections(null, null, 'created_at', 'desc', arrayKeyword);
    assert.ok(Array.isArray(result), '应返回数组');
    assert.ok(result.length > 0, '使用数组参数时也应能正常返回结果');
    
    result.forEach(record => {
      assert.ok(
        record.remarks && record.remarks.includes('损伤'),
        '搜索结果的备注应包含关键字'
      );
    });
  });

  await runTest('【BUG修复验证】getAllInspections 接收数字类型 remarksKeyword 不应崩溃', async () => {
    const { initDatabase, getAllInspections } = require('../src/database');
    await initDatabase();

    const result = await getAllInspections(null, null, 'created_at', 'desc', 12345);
    assert.ok(Array.isArray(result), '应返回数组');
  });

  await runTest('【BUG修复验证】getAllInspections 接收对象类型 remarksKeyword 不应崩溃', async () => {
    const { initDatabase, getAllInspections } = require('../src/database');
    await initDatabase();

    const result = await getAllInspections(null, null, 'created_at', 'desc', { foo: 'bar' });
    assert.ok(Array.isArray(result), '应返回数组');
  });

  await runTest('【BUG修复验证】getAllInspections 空数组 remarksKeyword 返回全部数据', async () => {
    const { initDatabase, getAllInspections } = require('../src/database');
    await initDatabase();

    const all = await getAllInspections();
    const emptyArrayResult = await getAllInspections(null, null, 'created_at', 'desc', []);
    assert.strictEqual(emptyArrayResult.length, all.length, '空数组参数应返回全部数据');
  });

  await runTest('【BUG修复验证】getAllInspections 所有参数为数组类型都不应崩溃', async () => {
    const { initDatabase, getAllInspections, createInspection } = require('../src/database');
    await initDatabase();
    
    await createInspection(1, '测试员', 'abnormal', '表面有损伤痕迹');
    await createInspection(2, '测试员', 'normal', '状态良好');

    const result = await getAllInspections(
      ['古代文明区', '艺术画廊'],
      ['normal', 'abnormal'],
      ['exhibit_name', 'created_at'],
      ['asc', 'desc'],
      ['损伤', '修复']
    );
    assert.ok(Array.isArray(result), '所有参数为数组时也应正常返回');
  });

  await runTest('【BUG修复验证】数组参数首元素为空时，取后续第一个有效值', async () => {
    const { initDatabase, getAllInspections, createInspection } = require('../src/database');
    await initDatabase();

    await createInspection(1, '测试员A', 'abnormal', '发现轻微损伤，需要修复');
    await createInspection(2, '测试员B', 'normal', '展品状态良好');

    const all = await getAllInspections();
    const strResult = await getAllInspections(null, null, 'created_at', 'desc', '损伤');
    const arrEmptyFirst = await getAllInspections(null, null, 'created_at', 'desc', ['', '损伤']);

    assert.strictEqual(
      arrEmptyFirst.length,
      strResult.length,
      '数组首元素为空时，应取后续第一个有效值，结果与直接传字符串相同'
    );
    assert.ok(arrEmptyFirst.length < all.length, '过滤后记录数应少于全部记录数');
  });

  await runTest('【BUG修复验证】数组参数前几个元素全为空时，跳过空值取有效', async () => {
    const { initDatabase, getAllInspections, createInspection } = require('../src/database');
    await initDatabase();

    await createInspection(1, '测试员', 'normal', '状态良好，无异常');

    const strResult = await getAllInspections(null, null, 'created_at', 'desc', '良好');
    const arrMultiEmpty = await getAllInspections(null, null, 'created_at', 'desc', ['', '', '  ', '良好']);

    assert.strictEqual(
      arrMultiEmpty.length,
      strResult.length,
      '数组前几个元素全为空时，应跳过空值取第一个有效值'
    );
  });

  await runTest('【BUG修复验证】数组参数全为空时返回全部数据（不崩溃）', async () => {
    const { initDatabase, getAllInspections } = require('../src/database');
    await initDatabase();

    const all = await getAllInspections();
    const allEmptyArr = await getAllInspections(null, null, 'created_at', 'desc', ['', '', '']);

    assert.strictEqual(allEmptyArr.length, all.length, '数组全为空时应返回全部数据');
  });

  await runTest('【BUG修复验证】remarksKeyword 数组元素自动 trim 后再判断有效性', async () => {
    const { initDatabase, getAllInspections, createInspection } = require('../src/database');
    await initDatabase();

    await createInspection(1, '测试员', 'abnormal', '有损伤痕迹需处理');

    const strResult = await getAllInspections(null, null, 'created_at', 'desc', '损伤');
    const arrSpaced = await getAllInspections(null, null, 'created_at', 'desc', ['  ', '  损伤  ']);

    assert.strictEqual(
      arrSpaced.length,
      strResult.length,
      '数组元素带前后空格时，应自动 trim 后再判断有效性'
    );
  });

  console.log(`\n📊 测试结果: ${passed}/${testCount} 通过`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
