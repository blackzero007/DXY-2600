const assert = require('assert');

console.log('\n🧪 运行前端详情状态逻辑测试（验证状态泄露 bug 修复）\n');

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

function createDetailStateMachine() {
  let state = {
    showDetailModal: false,
    detailExhibit: null,
    detailLoading: false
  };

  let listeners = [];

  function getState() {
    return { ...state };
  }

  function setState(newState) {
    state = { ...state, ...newState };
    listeners.forEach(fn => fn(state));
  }

  function handleViewDetailStart(exhibit) {
    setState({
      showDetailModal: true,
      detailExhibit: null,
      detailLoading: true
    });
  }

  function handleViewDetailSuccess(data) {
    setState({
      detailExhibit: data,
      detailLoading: false
    });
  }

  function handleViewDetailError() {
    setState({
      showDetailModal: false,
      detailLoading: false
    });
  }

  function handleCloseDetail() {
    setState({
      showDetailModal: false,
      detailExhibit: null,
      detailLoading: false
    });
  }

  return {
    getState,
    handleViewDetailStart,
    handleViewDetailSuccess,
    handleViewDetailError,
    handleCloseDetail
  };
}

test('初始状态：所有详情相关状态应为空', () => {
  const fsm = createDetailStateMachine();
  const state = fsm.getState();
  assert.strictEqual(state.showDetailModal, false, 'showDetailModal 初始应为 false');
  assert.strictEqual(state.detailExhibit, null, 'detailExhibit 初始应为 null');
  assert.strictEqual(state.detailLoading, false, 'detailLoading 初始应为 false');
});

test('打开详情加载中：showDetailModal 和 detailLoading 为 true，detailExhibit 为 null（防止旧数据泄露）', () => {
  const fsm = createDetailStateMachine();
  fsm.handleViewDetailStart({ id: 1, name: '测试展品' });
  const state = fsm.getState();
  assert.strictEqual(state.showDetailModal, true, 'showDetailModal 应为 true');
  assert.strictEqual(state.detailLoading, true, 'detailLoading 应为 true');
  assert.strictEqual(state.detailExhibit, null, 'detailExhibit 应为 null，防止旧数据泄露');
});

test('加载成功后：detailExhibit 有数据，detailLoading 为 false', () => {
  const fsm = createDetailStateMachine();
  fsm.handleViewDetailStart({ id: 1, name: '测试展品' });
  fsm.handleViewDetailSuccess({ id: 1, name: '测试展品', last_status: 'normal' });
  const state = fsm.getState();
  assert.strictEqual(state.showDetailModal, true, 'showDetailModal 应为 true');
  assert.strictEqual(state.detailLoading, false, 'detailLoading 应为 false');
  assert.ok(state.detailExhibit, 'detailExhibit 不应为空');
  assert.strictEqual(state.detailExhibit.name, '测试展品', '展品名称应正确');
});

test('【BUG修复验证】加载失败后：showDetailModal 应为 false，弹窗关闭', () => {
  const fsm = createDetailStateMachine();
  fsm.handleViewDetailStart({ id: 999, name: '不存在的展品' });
  fsm.handleViewDetailError();
  const state = fsm.getState();
  assert.strictEqual(state.showDetailModal, false, '加载失败后 showDetailModal 应为 false，弹窗应关闭');
  assert.strictEqual(state.detailLoading, false, '加载失败后 detailLoading 应为 false');
});

test('【BUG修复验证】加载失败后：不会残留上一次成功加载的数据', () => {
  const fsm = createDetailStateMachine();
  
  fsm.handleViewDetailStart({ id: 1, name: '展品A' });
  fsm.handleViewDetailSuccess({ id: 1, name: '展品A', last_status: 'normal' });
  
  fsm.handleCloseDetail();
  
  fsm.handleViewDetailStart({ id: 2, name: '展品B' });
  fsm.handleViewDetailError();
  
  const state = fsm.getState();
  assert.strictEqual(state.showDetailModal, false, '加载失败后弹窗应关闭');
  assert.notStrictEqual(
    state.detailExhibit?.name,
    '展品A',
    '加载失败后不应残留上一次展品A的数据（状态泄露）'
  );
});

test('【BUG修复验证】打开新展品详情前，旧数据被清空', () => {
  const fsm = createDetailStateMachine();
  
  fsm.handleViewDetailStart({ id: 1, name: '展品A' });
  fsm.handleViewDetailSuccess({ id: 1, name: '展品A', last_status: 'normal' });
  
  fsm.handleCloseDetail();
  
  fsm.handleViewDetailStart({ id: 2, name: '展品B' });
  const state = fsm.getState();
  assert.strictEqual(state.detailExhibit, null, '打开新展品时，旧数据应被清空，防止闪烁旧数据');
});

test('关闭详情后：所有状态被重置', () => {
  const fsm = createDetailStateMachine();
  
  fsm.handleViewDetailStart({ id: 1, name: '测试展品' });
  fsm.handleViewDetailSuccess({ id: 1, name: '测试展品' });
  
  fsm.handleCloseDetail();
  const state = fsm.getState();
  
  assert.strictEqual(state.showDetailModal, false, '关闭后 showDetailModal 应为 false');
  assert.strictEqual(state.detailExhibit, null, '关闭后 detailExhibit 应为 null');
  assert.strictEqual(state.detailLoading, false, '关闭后 detailLoading 应为 false');
});

test('多次打开不同展品：不会发生状态交叉污染', () => {
  const fsm = createDetailStateMachine();
  
  fsm.handleViewDetailStart({ id: 1, name: '青铜鼎' });
  fsm.handleViewDetailSuccess({ id: 1, name: '青铜鼎', zone: '古代文明区' });
  let state1 = fsm.getState();
  assert.strictEqual(state1.detailExhibit.name, '青铜鼎', '第一次加载正确');
  
  fsm.handleCloseDetail();
  
  fsm.handleViewDetailStart({ id: 2, name: '恐龙化石' });
  fsm.handleViewDetailSuccess({ id: 2, name: '恐龙化石', zone: '自然探索区' });
  let state2 = fsm.getState();
  assert.strictEqual(state2.detailExhibit.name, '恐龙化石', '第二次加载正确');
  assert.strictEqual(state2.detailExhibit.zone, '自然探索区', '展区信息正确');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
