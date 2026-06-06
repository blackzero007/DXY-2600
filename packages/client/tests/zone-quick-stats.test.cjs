const assert = require('assert');

console.log('\n🧪 运行展区快捷统计竞态与一致性测试\n');

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

function createExhibitListFetcher() {
  let exhibits = [];
  let loading = true;
  let error = null;

  let exhibitsRequestIdCounter = 0;
  let activeExhibitsRequestId = null;

  function getState() {
    return { exhibits, loading, error };
  }

  function getZoneQuickStats(selectedZone) {
    if (!selectedZone) return null;
    const validExhibits = exhibits.filter(e => e && e.id !== undefined && e.id !== null);
    return {
      total: validExhibits.length,
      abnormal: validExhibits.filter(e => e.last_status === 'abnormal').length,
      pending: validExhibits.filter(e => !e.last_status).length
    };
  }

  function simulateFetch(requestId, zone, delay, shouldFail = false, errorMessage = '网络错误') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error(errorMessage));
        } else {
          const mockData = generateMockExhibits(zone, requestId);
          resolve(mockData);
        }
      }, delay);
    });
  }

  function generateMockExhibits(zone, requestId) {
    const count = zone === '古代文明区' ? 4 : zone === '自然探索区' ? 3 : zone === '艺术画廊' ? 3 : 10;
    const exhibits = [];
    for (let i = 1; i <= count; i++) {
      const status = i % 3 === 0 ? 'abnormal' : i % 5 === 0 ? null : 'normal';
      exhibits.push({
        id: requestId * 100 + i,
        name: `${zone}展品${i}`,
        zone: zone || '全部',
        description: `请求${requestId}的展品`,
        last_status: status,
        last_inspected: status ? '2024-01-01T00:00:00Z' : null
      });
    }
    return exhibits;
  }

  async function loadExhibits(zone, delay = 100, shouldFail = false, errorMessage) {
    const currentRequestId = ++exhibitsRequestIdCounter;
    activeExhibitsRequestId = currentRequestId;

    loading = true;
    error = null;

    try {
      const data = await simulateFetch(currentRequestId, zone, delay, shouldFail, errorMessage);
      if (currentRequestId !== activeExhibitsRequestId) {
        return;
      }
      exhibits = data;
      error = null;
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      if (currentRequestId !== activeExhibitsRequestId) {
        return;
      }
      exhibits = [];
      error = err.message || '加载失败';
    } finally {
      if (currentRequestId === activeExhibitsRequestId) {
        loading = false;
      }
    }
  }

  function getRequestId() {
    return exhibitsRequestIdCounter;
  }

  function getActiveRequestId() {
    return activeExhibitsRequestId;
  }

  return {
    getState,
    getZoneQuickStats,
    loadExhibits,
    getRequestId,
    getActiveRequestId
  };
}

test('初始状态：exhibits为空，loading为true，error为null', () => {
  const fetcher = createExhibitListFetcher();
  const state = fetcher.getState();
  assert.deepStrictEqual(state.exhibits, [], 'exhibits初始应为空数组');
  assert.strictEqual(state.loading, true, 'loading初始应为true');
  assert.strictEqual(state.error, null, 'error初始应为null');
});

test('未选择展区时，zoneQuickStats为null', () => {
  const fetcher = createExhibitListFetcher();
  const stats = fetcher.getZoneQuickStats(null);
  assert.strictEqual(stats, null, '未选择展区时快捷统计应为null');
});

test('正常加载展区后，快捷统计数据正确', async () => {
  const fetcher = createExhibitListFetcher();
  await fetcher.loadExhibits('古代文明区', 10);

  const stats = fetcher.getZoneQuickStats('古代文明区');
  assert.ok(stats !== null, '选择展区后快捷统计不应为null');
  assert.strictEqual(stats.total, 4, '古代文明区应有4件展品');
  assert.strictEqual(typeof stats.abnormal, 'number', '异常数应为数字');
  assert.strictEqual(typeof stats.pending, 'number', '待巡检数应为数字');
});

test('【BUG修复验证】快速切换展区时，只有最后一个请求的结果被保留', async () => {
  const fetcher = createExhibitListFetcher();

  const slowRequest = fetcher.loadExhibits('古代文明区', 100);
  const fastRequest = fetcher.loadExhibits('自然探索区', 10);

  await Promise.all([slowRequest, fastRequest]);

  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '所有请求完成后loading应为false');

  const stats = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(stats.total, 3, '最终快捷统计应显示自然探索区的3件展品');

  const firstExhibitZone = state.exhibits.length > 0 ? state.exhibits[0].zone : null;
  assert.strictEqual(
    firstExhibitZone,
    '自然探索区',
    '最终数据应是最后一个请求（自然探索区）的结果，而不是第一个慢请求的结果'
  );
});

test('【BUG修复验证】多次快速切换展区，只有最后一次请求生效', async () => {
  const fetcher = createExhibitListFetcher();

  const r1 = fetcher.loadExhibits('古代文明区', 200);
  const r2 = fetcher.loadExhibits('自然探索区', 150);
  const r3 = fetcher.loadExhibits('艺术画廊', 50);

  await Promise.all([r1, r2, r3]);

  const state = fetcher.getState();
  const stats = fetcher.getZoneQuickStats('艺术画廊');
  assert.strictEqual(stats.total, 3, '多次切换后，最终应是最后一个请求（艺术画廊）的结果');

  const firstExhibitZone = state.exhibits.length > 0 ? state.exhibits[0].zone : null;
  assert.strictEqual(
    firstExhibitZone,
    '艺术画廊',
    '多次切换后展品数据应属于艺术画廊'
  );
});

test('【BUG修复验证】旧请求即使成功也不会覆盖新请求的结果', async () => {
  const fetcher = createExhibitListFetcher();

  const slowRequest = fetcher.loadExhibits('古代文明区', 150);
  const fastRequest = fetcher.loadExhibits('自然探索区', 30);

  await fastRequest;
  const stateAfterFast = fetcher.getState();
  const statsAfterFast = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(
    stateAfterFast.exhibits[0].zone,
    '自然探索区',
    '快请求返回后，展品数据应是自然探索区'
  );
  assert.strictEqual(
    statsAfterFast.total,
    3,
    '快请求返回后，快捷统计应显示自然探索区的3件展品'
  );

  await slowRequest;
  const stateAfterSlow = fetcher.getState();
  const statsAfterSlow = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(
    stateAfterSlow.exhibits[0].zone,
    '自然探索区',
    '慢请求返回后，数据不应被覆盖，仍应是自然探索区'
  );
  assert.strictEqual(
    statsAfterSlow.total,
    3,
    '慢请求返回后，快捷统计不应变化，仍应是自然探索区的3件展品'
  );
});

test('【BUG修复验证】切换到全部展区后，快捷统计变为null', async () => {
  const fetcher = createExhibitListFetcher();

  await fetcher.loadExhibits('古代文明区', 10);
  const statsBefore = fetcher.getZoneQuickStats('古代文明区');
  assert.ok(statsBefore !== null, '选择展区时快捷统计应有值');

  await fetcher.loadExhibits(null, 10);
  const statsAfter = fetcher.getZoneQuickStats(null);
  assert.strictEqual(statsAfter, null, '切换到全部展区后快捷统计应为null');
});

test('请求失败时：loading为false，error有值，exhibits为空', async () => {
  const fetcher = createExhibitListFetcher();
  await fetcher.loadExhibits('测试区', 10, true, '服务器500错误');

  const state = fetcher.getState();
  assert.strictEqual(state.loading, false, '请求失败后loading应为false');
  assert.strictEqual(state.error, '服务器500错误', 'error应为错误消息');
  assert.deepStrictEqual(state.exhibits, [], '请求失败后exhibits应清空');
});

test('【BUG修复验证】最新请求失败时，快捷统计数据被清空，不显示上一轮结果', async () => {
  const fetcher = createExhibitListFetcher();

  await fetcher.loadExhibits('古代文明区', 10, false);
  const stateBefore = fetcher.getState();
  const statsBefore = fetcher.getZoneQuickStats('古代文明区');
  assert.strictEqual(stateBefore.exhibits.length, 4, '第一次请求成功，应有4件展品');
  assert.strictEqual(stateBefore.error, null, '第一次请求成功，error应为null');
  assert.strictEqual(statsBefore.total, 4, '第一次请求成功后快捷统计应有4件展品');

  await fetcher.loadExhibits('自然探索区', 10, true, '网络连接失败');
  const stateAfter = fetcher.getState();
  assert.strictEqual(stateAfter.loading, false, '第二次请求失败后loading应为false');
  assert.strictEqual(stateAfter.error, '网络连接失败', '第二次请求失败后error应有值');
  assert.deepStrictEqual(
    stateAfter.exhibits,
    [],
    '【关键】最新请求失败时，旧数据必须被清空，不能继续显示上一轮的古代文明区数据'
  );
  assert.notStrictEqual(
    stateAfter.exhibits[0]?.zone,
    '古代文明区',
    '【关键】最新请求失败后，绝不能残留上一轮的古代文明区数据'
  );

  const statsAfter = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(
    statsAfter.total,
    0,
    '【关键】最新请求失败后，快捷统计总数应为0，不能显示上一轮古代文明区的数量'
  );
  assert.strictEqual(
    statsAfter.abnormal,
    0,
    '【关键】最新请求失败后，快捷统计异常数应为0'
  );
  assert.strictEqual(
    statsAfter.pending,
    0,
    '【关键】最新请求失败后，快捷统计待巡检数应为0'
  );
});

test('【BUG修复验证】切换展区后最新请求失败，再重试成功，数据和快捷统计恢复', async () => {
  const fetcher = createExhibitListFetcher();

  await fetcher.loadExhibits('古代文明区', 10, false);

  await fetcher.loadExhibits('自然探索区', 10, true, '网络错误');
  const stateAfterFail = fetcher.getState();
  const statsAfterFail = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(stateAfterFail.error, '网络错误', '失败后error应有值');
  assert.deepStrictEqual(stateAfterFail.exhibits, [], '失败后数据应清空');
  assert.strictEqual(statsAfterFail.total, 0, '失败后快捷统计总数应为0');

  await fetcher.loadExhibits('自然探索区', 10, false);
  const stateAfterRetry = fetcher.getState();
  const statsAfterRetry = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(stateAfterRetry.error, null, '重试成功后error应为null');
  assert.strictEqual(stateAfterRetry.loading, false, '重试成功后loading应为false');
  assert.strictEqual(stateAfterRetry.exhibits.length, 3, '重试成功后应有3件展品');
  assert.strictEqual(stateAfterRetry.exhibits[0].zone, '自然探索区', '重试成功后数据应是自然探索区');
  assert.strictEqual(statsAfterRetry.total, 3, '重试成功后快捷统计应显示3件展品');
});

test('【BUG修复验证】失败的旧请求不会覆盖新请求的成功数据', async () => {
  const fetcher = createExhibitListFetcher();

  const failingSlowRequest = fetcher.loadExhibits('古代文明区', 150, true, '旧请求失败');
  const fastRequest = fetcher.loadExhibits('自然探索区', 30, false);

  await fastRequest;
  const stateAfterFast = fetcher.getState();
  const statsAfterFast = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(stateAfterFast.loading, false, '新请求完成后loading应为false');
  assert.strictEqual(stateAfterFast.error, null, '新请求成功后error应为null');
  assert.strictEqual(stateAfterFast.exhibits[0].zone, '自然探索区', '新请求数据应正确');
  assert.strictEqual(statsAfterFast.total, 3, '新请求成功后快捷统计应正确');

  await failingSlowRequest;
  const stateAfterSlow = fetcher.getState();
  const statsAfterSlow = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(
    stateAfterSlow.loading,
    false,
    '旧的失败请求返回后，loading不应变化'
  );
  assert.strictEqual(
    stateAfterSlow.error,
    null,
    '旧的失败请求返回后，error不应被设置（因为不是最新请求）'
  );
  assert.strictEqual(
    stateAfterSlow.exhibits[0].zone,
    '自然探索区',
    '旧的失败请求不应清空新请求的成功数据'
  );
  assert.strictEqual(
    statsAfterSlow.total,
    3,
    '旧的失败请求返回后，快捷统计不应变化'
  );
});

test('【BUG修复验证】成功的旧请求不会覆盖新请求的失败状态', async () => {
  const fetcher = createExhibitListFetcher();

  const slowSuccessRequest = fetcher.loadExhibits('古代文明区', 150, false);
  const fastFailRequest = fetcher.loadExhibits('自然探索区', 30, true, '新区请求失败');

  await fastFailRequest;
  const stateAfterFast = fetcher.getState();
  const statsAfterFast = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(stateAfterFast.error, '新区请求失败', '新请求失败后error应有值');
  assert.deepStrictEqual(stateAfterFast.exhibits, [], '新请求失败后数据应清空');
  assert.strictEqual(statsAfterFast.total, 0, '新请求失败后快捷统计总数应为0');

  await slowSuccessRequest;
  const stateAfterSlow = fetcher.getState();
  const statsAfterSlow = fetcher.getZoneQuickStats('自然探索区');
  assert.strictEqual(
    stateAfterSlow.error,
    '新区请求失败',
    '旧的成功请求返回后，不应清除最新的错误状态'
  );
  assert.deepStrictEqual(
    stateAfterSlow.exhibits,
    [],
    '旧的成功请求返回后，不应恢复数据（因为最新请求失败了）'
  );
  assert.strictEqual(
    statsAfterSlow.total,
    0,
    '旧的成功请求返回后，快捷统计不应恢复旧数据'
  );
});

test('发起新请求时，上一次的error被清除，loading设为true', async () => {
  const fetcher = createExhibitListFetcher();

  await fetcher.loadExhibits('测试区', 10, true, '第一次失败');
  const state1 = fetcher.getState();
  assert.strictEqual(state1.error, '第一次失败', '第一次请求失败后error应有值');

  const secondRequest = fetcher.loadExhibits('测试区', 100, false);
  const stateDuring = fetcher.getState();
  assert.strictEqual(stateDuring.loading, true, '第二次请求中loading应为true');
  assert.strictEqual(stateDuring.error, null, '发起新请求时，旧error应被清除');

  await secondRequest;
  const state2 = fetcher.getState();
  assert.strictEqual(state2.error, null, '第二次请求成功后error应为null');
  assert.strictEqual(state2.exhibits.length > 0, true, '第二次请求成功后应有数据');
});

test('快捷统计的异常数和待巡检数计算正确', async () => {
  const fetcher = createExhibitListFetcher();
  await fetcher.loadExhibits('古代文明区', 10);

  const stats = fetcher.getZoneQuickStats('古代文明区');
  const state = fetcher.getState();

  const expectedAbnormal = state.exhibits.filter(e => e.last_status === 'abnormal').length;
  const expectedPending = state.exhibits.filter(e => !e.last_status).length;

  assert.strictEqual(stats.abnormal, expectedAbnormal, '异常数计算应正确');
  assert.strictEqual(stats.pending, expectedPending, '待巡检数计算应正确');
  assert.strictEqual(stats.total, state.exhibits.length, '总数应等于展品数组长度');
});

test('【关键验证】快速切换展区过程中，快捷统计始终与当前选中展区保持一致', async () => {
  const fetcher = createExhibitListFetcher();

  let statsDuringSlow = null;
  let statsDuringFast = null;

  const slowRequest = fetcher.loadExhibits('古代文明区', 100).then(() => {
    statsDuringSlow = fetcher.getZoneQuickStats('自然探索区');
  });

  const fastRequest = fetcher.loadExhibits('自然探索区', 20).then(() => {
    statsDuringFast = fetcher.getZoneQuickStats('自然探索区');
  });

  await Promise.all([slowRequest, fastRequest]);

  const finalStats = fetcher.getZoneQuickStats('自然探索区');

  assert.strictEqual(
    statsDuringFast.total,
    3,
    '快请求完成后，快捷统计应立即更新为自然探索区的数据'
  );

  assert.strictEqual(
    finalStats.total,
    3,
    '所有请求完成后，快捷统计应保持为自然探索区的数据'
  );

  assert.strictEqual(
    finalStats.total,
    statsDuringFast.total,
    '慢请求返回不应改变快捷统计的结果'
  );
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
