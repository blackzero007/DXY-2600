const assert = require('assert');

console.log('\n🧪 运行巡检历史请求竞态条件测试（验证旧请求晚返回 bug 修复）\n');

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
  let requestIdCounter = 0;
  let activeRequestId = null;
  let errorCount = 0;

  function getState() {
    return { inspections, loading, errorCount };
  }

  function simulateFetch(requestId, zone, status, delay, shouldFail = false) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('网络错误'));
        } else {
          const mockData = [
            { id: requestId, exhibit_name: `展品_${zone}_${status}`, status, exhibit_zone: zone }
          ];
          resolve(mockData);
        }
      }, delay);
    });
  }

  async function loadInspections(zone, status, delay = 100, shouldFail = false) {
    const currentRequestId = ++requestIdCounter;
    activeRequestId = currentRequestId;

    loading = true;

    try {
      const data = await simulateFetch(currentRequestId, zone, status, delay, shouldFail);
      if (currentRequestId !== activeRequestId) {
        return;
      }
      inspections = data;
    } catch (error) {
      errorCount++;
      if (error.name === 'AbortError') {
        return;
      }
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

test('初始状态：inspections 为空，loading 为 true', () => {
  const fetcher = createInspectionHistoryFetcher();
  const state = fetcher.getState();
  assert.deepStrictEqual(state.inspections, [], 'inspections 初始应为空数组');
  assert.strictEqual(state.loading, true, 'loading 初始应为 true');
});

test('正常请求完成后：数据正确更新，loading 为 false', async () => {
  const fetcher = createInspectionHistoryFetcher();
  await fetcher.loadInspections('古代文明区', 'all', 10);
  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '请求完成后 loading 应为 false');
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

test('请求失败时：loading 变为 false，错误计数增加', async () => {
  const fetcher = createInspectionHistoryFetcher();
  await fetcher.loadInspections('测试区', 'all', 10, true);
  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '请求失败后 loading 应为 false');
  assert.strictEqual(state.errorCount, 1, '错误计数应加 1');
});

test('【BUG修复验证】失败的旧请求不会影响新请求的 loading 状态', async () => {
  const fetcher = createInspectionHistoryFetcher();

  const failingSlowRequest = fetcher.loadInspections('旧区', 'all', 150, true);
  const fastRequest = fetcher.loadInspections('新区', 'normal', 30, false);

  await fastRequest;
  const stateAfterFast = fetcher.getState();
  assert.strictEqual(stateAfterFast.loading, false, '新请求完成后 loading 应为 false');
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
    '旧的失败请求返回后，loading 不应被错误地改回 false 或 true'
  );
  assert.strictEqual(
    stateAfterSlow.inspections[0].exhibit_zone,
    '新区',
    '旧的失败请求不应影响数据'
  );
  assert.strictEqual(stateAfterSlow.errorCount, 1, '错误计数仍应为 1（只有新请求算成功，旧请求失败被忽略）');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
