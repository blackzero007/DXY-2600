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

  console.log(`\n📊 测试结果: ${passed}/${testCount} 通过`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
