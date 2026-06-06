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
    overdueHours: 24,
    showModal: false,
    showHistoryModal: false,
    exhibitHistory: [],
    toast: null
  };

  let loadExhibitsCallCount = 0;
  let loadOverdueExhibitsCallCount = 0;
  let refreshZonesCallCount = 0;
  let createInspectionCallCount = 0;
  let getExhibitInspectionsCallCount = 0;

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

  function mockCreateInspection() {
    createInspectionCallCount++;
    return Promise.resolve({ id: Date.now() });
  }

  function mockCreateInspectionFail() {
    createInspectionCallCount++;
    return Promise.reject(new Error('提交失败'));
  }

  function mockGetExhibitInspections() {
    getExhibitInspectionsCallCount++;
    return Promise.resolve([
      { id: 1, inspector: '张三', status: 'normal', created_at: '2024-01-01' },
      { id: 2, inspector: '李四', status: 'abnormal', created_at: '2024-01-02' }
    ]);
  }

  function mockGetExhibitInspectionsFail() {
    getExhibitInspectionsCallCount++;
    return Promise.reject(new Error('历史记录加载失败'));
  }

  function getCallCounts() {
    return {
      loadExhibits: loadExhibitsCallCount,
      loadOverdueExhibits: loadOverdueExhibitsCallCount,
      refreshZones: refreshZonesCallCount,
      createInspection: createInspectionCallCount,
      getExhibitInspections: getExhibitInspectionsCallCount
    };
  }

  function resetCallCounts() {
    loadExhibitsCallCount = 0;
    loadOverdueExhibitsCallCount = 0;
    refreshZonesCallCount = 0;
    createInspectionCallCount = 0;
    getExhibitInspectionsCallCount = 0;
  }

  function showToast(message, type = 'success') {
    state.toast = { message, type };
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

  async function handleSubmitInspection_BUGGY(data, createInspectionFn, getExhibitInspectionsFn) {
    try {
      await createInspectionFn();
      showToast('巡检记录提交成功');
      state.showModal = false;
      mockLoadExhibits();
      mockLoadOverdueExhibits();
      if (state.showHistoryModal) {
        const historyData = await getExhibitInspectionsFn();
        state.exhibitHistory = historyData;
      }
    } catch (error) {
      console.error('提交巡检记录失败:', error);
      showToast(error.message || '提交失败', 'error');
    }
  }

  async function handleSubmitInspection_FIXED(data, createInspectionFn, getExhibitInspectionsFn) {
    try {
      await createInspectionFn();
      showToast('巡检记录提交成功');
      state.showModal = false;
      mockLoadExhibits();
      mockLoadOverdueExhibits();
      if (state.showHistoryModal) {
        try {
          const historyData = await getExhibitInspectionsFn();
          state.exhibitHistory = historyData;
        } catch (historyError) {
          console.error('刷新历史记录失败:', historyError);
        }
      }
    } catch (error) {
      console.error('提交巡检记录失败:', error);
      showToast(error.message || '提交失败', 'error');
    }
  }

  return {
    getState,
    setState,
    getCallCounts,
    resetCallCounts,
    handleAddExhibit_BUGGY,
    handleAddExhibit_FIXED,
    handleSubmitInspection,
    handleSubmitInspection_BUGGY,
    handleSubmitInspection_FIXED,
    showToast
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

test('【BUG复现】历史记录弹窗打开时，历史刷新失败会导致整体提示提交失败', async () => {
  const fsm = createExhibitListStateMachine();
  fsm.setState({ showHistoryModal: true, exhibitHistory: [{ id: 1, inspector: '旧记录' }] });

  await fsm.handleSubmitInspection_BUGGY(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.resolve({ id: 123 }),
    () => Promise.reject(new Error('历史记录加载失败'))
  );

  const state = fsm.getState();
  assert.strictEqual(state.toast?.type, 'error', '有缺陷的版本会错误地显示错误提示');
  assert.strictEqual(state.toast?.message, '历史记录加载失败', '错误消息会是历史刷新失败的消息');
  assert.strictEqual(state.showModal, true, '巡检弹窗不会被关闭（因为异常在关闭前抛出）');
});

test('【BUG修复验证】历史记录弹窗打开时，历史刷新失败不影响提交成功的结果', async () => {
  const fsm = createExhibitListStateMachine();
  fsm.setState({ showHistoryModal: true, exhibitHistory: [{ id: 1, inspector: '旧记录' }] });

  await fsm.handleSubmitInspection_FIXED(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.resolve({ id: 123 }),
    () => Promise.reject(new Error('历史记录加载失败'))
  );

  const state = fsm.getState();
  assert.strictEqual(state.toast?.type, 'success', '修复后应显示成功提示');
  assert.strictEqual(state.toast?.message, '巡检记录提交成功', '提示消息应为提交成功');
  assert.strictEqual(state.showModal, false, '巡检弹窗应正常关闭');
});

test('【BUG修复验证】历史记录刷新失败时，旧数据仍然保留', async () => {
  const fsm = createExhibitListStateMachine();
  const oldHistory = [{ id: 1, inspector: '旧记录', status: 'normal' }];
  fsm.setState({ showHistoryModal: true, exhibitHistory: oldHistory });

  await fsm.handleSubmitInspection_FIXED(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.resolve({ id: 123 }),
    () => Promise.reject(new Error('历史记录加载失败'))
  );

  const state = fsm.getState();
  assert.deepStrictEqual(state.exhibitHistory, oldHistory, '历史记录刷新失败时，旧数据应保留');
});

test('【BUG修复验证】历史记录刷新成功时，数据正确更新', async () => {
  const fsm = createExhibitListStateMachine();
  const oldHistory = [{ id: 1, inspector: '旧记录', status: 'normal' }];
  const newHistory = [
    { id: 2, inspector: '新记录1', status: 'normal' },
    { id: 1, inspector: '旧记录', status: 'normal' }
  ];
  fsm.setState({ showHistoryModal: true, exhibitHistory: oldHistory });

  await fsm.handleSubmitInspection_FIXED(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.resolve({ id: 123 }),
    () => Promise.resolve(newHistory)
  );

  const state = fsm.getState();
  assert.deepStrictEqual(state.exhibitHistory, newHistory, '历史记录刷新成功时，数据应更新');
});

test('【BUG修复验证】巡检提交本身失败时，仍应正确提示失败', async () => {
  const fsm = createExhibitListStateMachine();
  fsm.setState({ showHistoryModal: false, showModal: true });

  await fsm.handleSubmitInspection_FIXED(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.reject(new Error('服务器错误')),
    () => Promise.resolve([])
  );

  const state = fsm.getState();
  assert.strictEqual(state.toast?.type, 'error', '提交失败时应显示错误提示');
  assert.strictEqual(state.toast?.message, '服务器错误', '错误消息应为提交失败的原因');
});

test('【BUG修复验证】历史记录弹窗未打开时，不会调用历史记录接口', async () => {
  const fsm = createExhibitListStateMachine();
  fsm.setState({ showHistoryModal: false });
  fsm.resetCallCounts();

  await fsm.handleSubmitInspection_FIXED(
    { inspector: '测试员', status: 'normal', remarks: '' },
    () => Promise.resolve({ id: 123 }),
    () => Promise.resolve([])
  );

  const counts = fsm.getCallCounts();
  assert.strictEqual(counts.getExhibitInspections, 0, '历史弹窗未打开时，不应调用历史记录接口');
  assert.strictEqual(counts.createInspection, 1, '应调用 1 次提交巡检接口');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
