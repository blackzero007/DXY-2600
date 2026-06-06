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
  delete require.cache[require.resolve('../src/routes/inspections')];
  const { initDatabase } = require('../src/database');
  return initDatabase();
}

function cleanupTestEnvironment() {
  try {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  } catch (e) {
  }
}

function createMockRes() {
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(body) {
      responseBody = body;
      return res;
    },
    _getStatus: () => statusCode,
    _getBody: () => responseBody
  };
  return res;
}

function createReq(body) {
  return {
    method: 'POST',
    url: '/',
    path: '/',
    body,
    params: {}
  };
}

function getPostHandler() {
  const router = require('../src/routes/inspections');
  const postLayer = router.stack.find(layer => 
    layer.route && layer.route.path === '/' && layer.route.methods && layer.route.methods.post
  );
  return postLayer.handle;
}

async function runTest(name, testFn) {
  testCount++;
  await setupTestEnvironment();
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

function callHandler(handler, req, res, timeout = 50) {
  return new Promise((resolve) => {
    let resolved = false;
    const next = (err) => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    handler(req, res, next);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, timeout);
  });
}

async function runTests() {
  console.log('\n🧪 运行巡检提交参数校验测试\n');

  await runTest('异常状态+备注为空字符串 → 返回400参数错误', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: ''
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400');
    assert.ok(res._getBody()?.error, '响应应包含 error 字段');
    assert.strictEqual(res._getBody().error, '异常状态下备注为必填项', '错误信息应正确');
  });

  await runTest('异常状态+备注为空白字符串 → 返回400参数错误', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: '   '
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400');
    assert.strictEqual(res._getBody().error, '异常状态下备注为必填项', '错误信息应正确');
  });

  await runTest('【BUG修复验证】异常状态+备注为null → 返回400而非500', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: null
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400，不能是500');
    assert.notStrictEqual(res._getStatus(), 500, '【关键】不能因为类型错误返回500');
    assert.ok(res._getBody()?.error, '响应应包含 error 字段');
  });

  await runTest('【BUG修复验证】异常状态+备注为undefined → 返回400而非500', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal'
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400，不能是500');
    assert.notStrictEqual(res._getStatus(), 500, '【关键】不能因为类型错误返回500');
  });

  await runTest('【BUG修复验证】异常状态+备注为数字类型 → 返回400而非500', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: 12345
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400，不能是500');
    assert.notStrictEqual(res._getStatus(), 500, '【关键】不能因为类型错误返回500');
  });

  await runTest('【BUG修复验证】异常状态+备注为对象类型 → 返回400而非500', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: { text: '这是一个对象' }
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400，不能是500');
    assert.notStrictEqual(res._getStatus(), 500, '【关键】不能因为类型异常返回500');
  });

  await runTest('【BUG修复验证】异常状态+备注为布尔值 → 返回400而非500', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: true
    });
    await callHandler(handler, req, res);
    assert.strictEqual(res._getStatus(), 400, '状态码应为400，不能是500');
    assert.notStrictEqual(res._getStatus(), 500, '【关键】不能因为类型异常返回500');
  });

  await runTest('正常状态+备注为空 → 正常提交成功（201）', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'normal',
      remarks: ''
    });
    await callHandler(handler, req, res, 100);
    assert.strictEqual(res._getStatus(), 201, '正常状态备注为空应提交成功，返回201');
  });

  await runTest('正常状态+备注为数字类型 → 正常提交（备注安全转为空字符串）', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'normal',
      remarks: 12345
    });
    await callHandler(handler, req, res, 100);
    assert.strictEqual(res._getStatus(), 201, '正常状态备注类型异常不应导致500，应安全处理');
  });

  await runTest('正常状态+备注为null → 正常提交（备注安全转为空字符串）', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'normal',
      remarks: null
    });
    await callHandler(handler, req, res, 100);
    assert.strictEqual(res._getStatus(), 201, '正常状态备注为null不应导致500，应安全处理');
  });

  await runTest('异常状态+有效备注 → 正常提交成功（201）', async () => {
    const handler = getPostHandler();
    const res = createMockRes();
    const req = createReq({
      exhibit_id: 1,
      inspector: '测试员',
      status: 'abnormal',
      remarks: '发现展品有轻微划痕，需要修复'
    });
    await callHandler(handler, req, res, 100);
    assert.strictEqual(res._getStatus(), 201, '异常状态有有效备注应提交成功');
    assert.ok(res._getBody()?.id, '响应应包含新建记录的id');
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
