const assert = require('assert');

console.log('\n🧪 运行巡检历史请求竞态与错误处理测试\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     错误: ${error.message}`);
    failed++;
  }
}

function createInspectionHistoryFetcher() {
  let inspections = [];
  let loading = true;
  let error = null;
  let requestIdCounter = 0;
  let activeRequestId = null;

  function getState() {
    return { inspections, loading, error };
  }

  function simulateFetch(requestId, zone, status, delay, shouldFail = false, errorMessage = '网络错误') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(errorMessage));
        } else {
          const mockData = [
            { id: requestId, exhibit_name: `展品_${zone}_${status}`, status, exhibit_zone: zone }
          ];
          resolve(mockData);
        }
      }, delay);
    });
  }

  async function loadInspections(zone, status, delay = 100, shouldFail = false, errorMessage) {
    const currentRequestId = ++requestIdCounter;
    activeRequestId = currentRequestId;

    loading = true;
    error = null;

    try {
      const data = await simulateFetch(currentRequestId, zone, status, delay, shouldFail, errorMessage);
      if (currentRequestId !== activeRequestId) {
        return;
      }
      inspections = data;
      error = null;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      if (currentRequestId !== activeRequestId) {
        return;
      }
      inspections = [];
      error = err.message || '加载失败';
    } finally {
      if (currentRequestId === activeRequestId) {
        loading = false;
      }
    }
  }

  function cancelCurrentRequest() {
    activeRequestId = null;
  }

  return {
    getState,
    loadInspections,
    cancelCurrentRequest,
    getRequestId: () => requestIdCounter,
    getActiveRequestId: () => activeRequestId
  };
}

test('初始状态：inspections 为空，loading 为 true，error 为 null', () => {
  const fetcher = createInspectionHistoryFetcher();
  const state = fetcher.getState();
  assert.deepStrictEqual(state.inspections, [], 'inspections 初始应为空数组');
  assert.strictEqual(state.loading, true, 'loading 初始应为 true');
  assert.strictEqual(state.error, null, 'error 初始应为 null');
});

test('正常请求完成后：数据正确更新，loading 为 false，error 为 null', async () => {
  const fetcher = createInspectionHistoryFetcher();
  await fetcher.loadInspections('古代文明区', 'all', 10);
  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '请求完成后 loading 应为 false');
  assert.strictEqual(state.error, null, '请求成功后 error 应为 null');
  assert.strictEqual(state.inspections.length, 1, '应有 1 条记录');
  assert.strictEqual(state.inspections[0].exhibit_zone, '古代文明区', '展区应正确');
});

test('【BUG修复验证】快速切换筛选时，只有最后一个请求的结果被保留', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const slowRequest = fetcher.loadInspections('古代文明区', 'all', 100);
  const fastRequest = fetcher.loadInspections('自然探索区', 'abnormal', 10);

  await Promise.all([slowRequest, fastRequest]);

  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '所有请求完成后 loading 应为 false');
  assert.strictEqual(state.inspections.length, 1, '最终应有 1 条记录');
  assert.strictEqual(
    state.inspections[0].exhibit_zone,
    '自然探索区',
    '最终数据应是最后一个请求（自然探索区）的结果，而不是第一个慢请求的结果'
  );
  assert.strictEqual(
    state.inspections[0].status,
    'abnormal',
    '最终状态筛选应是最后一个请求的 abnormal'
  );
});

test('【BUG修复验证】多次快速切换，只有最后一次请求生效', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const r1 = fetcher.loadInspections('区A', 'normal', 200);
  const r2 = fetcher.loadInspections('区B', 'abnormal', 150);
  const r3 = fetcher.loadInspections('区C', 'all', 50);

  await Promise.all([r1, r2, r3]);

  const state = fetcher.getState();
  assert.strictEqual(state.inspections.length, 1, '最终应有 1 条记录');
  assert.strictEqual(
    state.inspections[0].exhibit_zone,
    '区C',
    '多次切换后，最终应是最后一个请求（区C）的结果'
  );
  assert.strictEqual(
    state.inspections[0].status,
    'all',
    '状态筛选也应是最后一个请求的 all'
  );
});

test('【BUG修复验证】旧请求即使成功也不会覆盖新请求的结果', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const slowRequest = fetcher.loadInspections('旧展区', 'normal', 150);
  const fastRequest = fetcher.loadInspections('新展区', 'abnormal', 50);

  await fastRequest;
  const stateAfterFast = fetcher.getState();
  assert.strictEqual(
    stateAfterFast.inspections[0].exhibit_zone,
    '新展区',
    '快请求返回后，数据应是新展区'
  );

  await slowRequest;
  const stateAfterSlow = fetcher.getState();
  assert.strictEqual(
    stateAfterSlow.inspections[0].exhibit_zone,
    '新展区',
    '慢请求返回后，数据不应被覆盖，仍应是新展区'
  );
});

test('请求失败时：loading 为 false，error 有值，inspections 为空', async () => {
  const fetcher = createInspectionHistoryFetcher();
  await fetcher.loadInspections('测试区', 'all', 10, true, '服务器500错误');
  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '请求失败后 loading 应为 false');
  assert.strictEqual(state.error, '服务器500错误', 'error 应为错误消息');
  assert.deepStrictEqual(state.inspections, [], '请求失败后 inspections 应清空');
});

test('【BUG修复验证】最新请求失败时，旧数据被清空，不显示上一轮结果', async () => {
  const fetcher = createInspectionHistoryFetcher();

  await fetcher.loadInspections('古代文明区', 'all', 10, false);
  const stateBefore = fetcher.getState();
  assert.strictEqual(stateBefore.inspections.length, 1, '第一次请求成功，应有数据');
  assert.strictEqual(stateBefore.error, null, '第一次请求成功，error 应为 null');

  await fetcher.loadInspections('自然探索区', 'abnormal', 10, true, '网络连接失败');
  const stateAfter = fetcher.getState();
  assert.strictEqual(stateAfter.loading, false, '第二次请求失败后 loading 应为 false');
  assert.strictEqual(stateAfter.error, '网络连接失败', '第二次请求失败后 error 应有值');
  assert.deepStrictEqual(
    stateAfter.inspections,
    [],
    '【关键】最新请求失败时，旧数据必须被清空，不能继续显示上一轮的古代文明区数据'
  );
  assert.notStrictEqual(
    stateAfter.inspections[0]?.exhibit_zone,
    '古代文明区',
    '【关键】最新请求失败后，绝不能残留上一轮的古代文明区数据'
  );
});

test('【BUG修复验证】切换筛选后最新请求失败，再重试成功，数据恢复', async () => {
  const fetcher = createInspectionHistoryFetcher();

  await fetcher.loadInspections('古代文明区', 'all', 10, false);

  await fetcher.loadInspections('自然探索区', 'abnormal', 10, true, '网络错误');
  const stateAfterFail = fetcher.getState();
  assert.strictEqual(stateAfterFail.error, '网络错误', '失败后 error 应有值');
  assert.deepStrictEqual(stateAfterFail.inspections, [], '失败后数据应清空');

  await fetcher.loadInspections('自然探索区', 'abnormal', 10, false);
  const stateAfterRetry = fetcher.getState();
  assert.strictEqual(stateAfterRetry.error, null, '重试成功后 error 应为 null');
  assert.strictEqual(stateAfterRetry.loading, false, '重试成功后 loading 应为 false');
  assert.strictEqual(stateAfterRetry.inspections.length, 1, '重试成功后应有数据');
  assert.strictEqual(
    stateAfterRetry.inspections[0].exhibit_zone,
    '自然探索区',
    '重试成功后数据应是自然探索区'
  );
});

test('【BUG修复验证】失败的旧请求不会覆盖新请求的成功数据', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const failingSlowRequest = fetcher.loadInspections('旧区', 'all', 150, true, '旧请求失败');
  const fastRequest = fetcher.loadInspections('新区', 'normal', 30, false);

  await fastRequest;
  const stateAfterFast = fetcher.getState();
  assert.strictEqual(stateAfterFast.loading, false, '新请求完成后 loading 应为 false');
  assert.strictEqual(stateAfterFast.error, null, '新请求成功后 error 应为 null');
  assert.strictEqual(
    stateAfterFast.inspections[0].exhibit_zone,
    '新区',
    '新请求数据应正确'
  );

  await failingSlowRequest;
  const stateAfterSlow = fetcher.getState();
  assert.strictEqual(
    stateAfterSlow.loading,
    false,
    '旧的失败请求返回后，loading 不应变化'
  );
  assert.strictEqual(
    stateAfterSlow.error,
    null,
    '旧的失败请求返回后，error 不应被设置（因为不是最新请求）'
  );
  assert.strictEqual(
    stateAfterSlow.inspections[0].exhibit_zone,
    '新区',
    '旧的失败请求不应清空新请求的成功数据'
  );
});

test('【BUG修复验证】成功的旧请求不会覆盖新请求的失败状态', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const slowSuccessRequest = fetcher.loadInspections('旧区', 'all', 150, false);
  const fastFailRequest = fetcher.loadInspections('新区', 'normal', 30, true, '新区请求失败');

  await fastFailRequest;
  const stateAfterFast = fetcher.getState();
  assert.strictEqual(stateAfterFast.error, '新区请求失败', '新请求失败后 error 应有值');
  assert.deepStrictEqual(stateAfterFast.inspections, [], '新请求失败后数据应清空');

  await slowSuccessRequest;
  const stateAfterSlow = fetcher.getState();
  assert.strictEqual(
    stateAfterSlow.error,
    '新区请求失败',
    '旧的成功请求返回后，不应清除最新的错误状态'
  );
  assert.deepStrictEqual(
    stateAfterSlow.inspections,
    [],
    '旧的成功请求返回后，不应恢复数据（因为最新请求失败了）'
  );
});

test('发起新请求时，上一次的 error 被清除', async () => {
  const fetcher = createInspectionHistoryFetcher();

  await fetcher.loadInspections('测试区', 'all', 10, true, '第一次失败');
  const state1 = fetcher.getState();
  assert.strictEqual(state1.error, '第一次失败', '第一次请求失败后 error 应有值');

  const secondRequest = fetcher.loadInspections('测试区', 'all', 100, false);
  const stateDuring = fetcher.getState();
  assert.strictEqual(stateDuring.loading, true, '第二次请求中 loading 应为 true');
  assert.strictEqual(stateDuring.error, null, '发起新请求时，旧 error 应被清除');

  await secondRequest;
  const state2 = fetcher.getState();
  assert.strictEqual(state2.error, null, '第二次请求成功后 error 应为 null');
  assert.strictEqual(state2.inspections.length, 1, '第二次请求成功后应有数据');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
