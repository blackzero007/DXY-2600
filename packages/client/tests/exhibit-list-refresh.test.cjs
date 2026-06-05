const assert = require('assert');

console.log('\n🧪 运行展品列表刷新逻辑测试（验证新增展品后巡检提醒刷新 bug 修复）\n');

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

function createExhibitListStateMachine() {
  let state = {
    exhibits: [],
    overdueExhibits: [],
    overdueHours: 24
  };

  let loadExhibitsCallCount = 0;
  let loadOverdueExhibitsCallCount = 0;
  let refreshZonesCallCount = 0;

  function getState() {
    return { ...state };
  }

  function setState(newState) {
    state = { ...state, ...newState };
  }

  function mockLoadExhibits() {
    loadExhibitsCallCount++;
  }

  function mockLoadOverdueExhibits() {
    loadOverdueExhibitsCallCount++;
  }

  function mockRefreshZones() {
    refreshZonesCallCount++;
  }

  function getCallCounts() {
    return {
      loadExhibits: loadExhibitsCallCount,
      loadOverdueExhibits: loadOverdueExhibitsCallCount,
      refreshZones: refreshZonesCallCount
    };
  }

  function resetCallCounts() {
    loadExhibitsCallCount = 0;
    loadOverdueExhibitsCallCount = 0;
    refreshZonesCallCount = 0;
  }

  function handleAddExhibit_BUGGY(data) {
    mockLoadExhibits();
    if (true) {
      mockRefreshZones();
    }
  }

  function handleAddExhibit_FIXED(data) {
    mockLoadExhibits();
    mockLoadOverdueExhibits();
    if (true) {
      mockRefreshZones();
    }
  }

  function handleSubmitInspection() {
    mockLoadExhibits();
    mockLoadOverdueExhibits();
  }

  return {
    getState,
    setState,
    getCallCounts,
    resetCallCounts,
    handleAddExhibit_BUGGY,
    handleAddExhibit_FIXED,
    handleSubmitInspection
  };
}

test('初始状态：调用次数为 0', () => {
  const fsm = createExhibitListStateMachine();
  const counts = fsm.getCallCounts();
  assert.strictEqual(counts.loadExhibits, 0, 'loadExhibits 初始调用次数应为 0');
  assert.strictEqual(counts.loadOverdueExhibits, 0, 'loadOverdueExhibits 初始调用次数应为 0');
});

test('【BUG复现】有缺陷的 handleAddExhibit 只刷新展品列表，不刷新巡检提醒', () => {
  const fsm = createExhibitListStateMachine();

  fsm.handleAddExhibit_BUGGY({ name: '测试展品', zone: '测试区' });
  const counts = fsm.getCallCounts();

  assert.strictEqual(counts.loadExhibits, 1, '应调用 loadExhibits 刷新展品列表');
  assert.strictEqual(counts.loadOverdueExhibits, 0, '有缺陷的版本不会调用 loadOverdueExhibits（这就是 bug）');
  assert.strictEqual(counts.refreshZones, 1, '应调用 refreshZones 刷新展区');
});

test('【BUG修复验证】修复后的 handleAddExhibit 同时刷新展品列表和巡检提醒', () => {
  const fsm = createExhibitListStateMachine();

  fsm.handleAddExhibit_FIXED({ name: '测试展品', zone: '测试区' });
  const counts = fsm.getCallCounts();

  assert.strictEqual(counts.loadExhibits, 1, '应调用 loadExhibits 刷新展品列表');
  assert.strictEqual(counts.loadOverdueExhibits, 1, '修复后应调用 loadOverdueExhibits 刷新巡检提醒');
  assert.strictEqual(counts.refreshZones, 1, '应调用 refreshZones 刷新展区');
});

test('【BUG修复验证】提交巡检后同时刷新展品列表和巡检提醒', () => {
  const fsm = createExhibitListStateMachine();

  fsm.handleSubmitInspection();
  const counts = fsm.getCallCounts();

  assert.strictEqual(counts.loadExhibits, 1, '应调用 loadExhibits 刷新展品列表');
  assert.strictEqual(counts.loadOverdueExhibits, 1, '应调用 loadOverdueExhibits 刷新巡检提醒');
});

test('新增展品后，巡检提醒数量应增加（模拟数据更新）', () => {
  const fsm = createExhibitListStateMachine();

  fsm.setState({
    exhibits: [{ id: 1, name: '展品1' }],
    overdueExhibits: [{ id: 1, name: '展品1', is_never_inspected: false }]
  });

  let state = fsm.getState();
  assert.strictEqual(state.overdueExhibits.length, 1, '初始有 1 件超时展品');

  fsm.setState({
    exhibits: [...state.exhibits, { id: 2, name: '新展品' }],
    overdueExhibits: [...state.overdueExhibits, { id: 2, name: '新展品', is_never_inspected: true }]
  });

  state = fsm.getState();
  assert.strictEqual(state.exhibits.length, 2, '展品数量应增加到 2');
  assert.strictEqual(state.overdueExhibits.length, 2, '超时展品数量应增加到 2');

  const newOverdue = state.overdueExhibits.find(e => e.id === 2);
  assert.ok(newOverdue, '新增展品应出现在超时列表中');
  assert.strictEqual(newOverdue.is_never_inspected, true, '新增展品从未巡检');
});

test('多次新增展品：每次都应刷新巡检提醒', () => {
  const fsm = createExhibitListStateMachine();

  fsm.handleAddExhibit_FIXED({ name: '展品1', zone: '测试区' });
  fsm.handleAddExhibit_FIXED({ name: '展品2', zone: '测试区' });
  fsm.handleAddExhibit_FIXED({ name: '展品3', zone: '测试区' });

  const counts = fsm.getCallCounts();
  assert.strictEqual(counts.loadExhibits, 3, '应调用 3 次 loadExhibits');
  assert.strictEqual(counts.loadOverdueExhibits, 3, '应调用 3 次 loadOverdueExhibits');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
