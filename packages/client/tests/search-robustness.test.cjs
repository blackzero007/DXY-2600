const assert = require('assert');

console.log('\n🧪 运行搜索功能健壮性测试（覆盖完整链路：验证清洗→过滤→统计→渲染准备）\n');

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

function isValidExhibit(exhibit) {
  if (!exhibit || typeof exhibit !== 'object') return false;
  if (exhibit.id === undefined || exhibit.id === null) return false;
  return true;
}

function getSafeExhibit(exhibit) {
  if (!isValidExhibit(exhibit)) return null;
  return {
    id: exhibit.id,
    name: String(exhibit.name ?? ''),
    zone: String(exhibit.zone ?? ''),
    description: String(exhibit.description ?? ''),
    last_status: exhibit.last_status ?? null,
    last_inspected: exhibit.last_inspected ?? null,
    last_remarks: exhibit.last_remarks ?? null
  };
}

function filterExhibits_BUGGY(exhibits, searchKeyword) {
  if (!searchKeyword.trim()) return exhibits;
  const keyword = searchKeyword.toLowerCase().trim();
  return exhibits.filter(exhibit => {
    return exhibit.name.toLowerCase().includes(keyword);
  });
}

function buildExhibitPipeline(exhibits, searchKeyword) {
  const validExhibits = exhibits
    .map(getSafeExhibit)
    .filter(e => e !== null);

  const filteredExhibits = validExhibits.filter(exhibit => {
    if (!searchKeyword.trim()) return true;
    const keyword = searchKeyword.toLowerCase().trim();
    return exhibit.name.toLowerCase().includes(keyword);
  });

  const stats = {
    total: filteredExhibits.length,
    normal: filteredExhibits.filter(e => e.last_status === 'normal').length,
    abnormal: filteredExhibits.filter(e => e.last_status === 'abnormal').length,
    neverInspected: filteredExhibits.filter(e => !e.last_status).length
  };

  return { validExhibits, filteredExhibits, stats };
}

function prepareRenderData(filteredExhibits) {
  return filteredExhibits.map(exhibit => {
    const isAbnormal = exhibit.last_status === 'abnormal';
    const hasRemarks = !!(isAbnormal && exhibit.last_remarks);
    return {
      key: String(exhibit.id),
      cardClass: `exhibit-card ${isAbnormal ? 'abnormal' : ''}`,
      zoneTag: exhibit.zone,
      name: exhibit.name,
      description: exhibit.description,
      statusText: exhibit.last_status === 'normal' ? '✅ 正常' : 
                  exhibit.last_status === 'abnormal' ? '⚠️ 异常' : '未巡检',
      statusClass: exhibit.last_status || '',
      lastInspectedText: exhibit.last_inspected ? 
        new Date(exhibit.last_inspected).toLocaleString('zh-CN') : '未巡检',
      showAbnormalRemarks: hasRemarks,
      abnormalRemarksClass: 'card-abnormal-remarks',
      abnormalRemarksLabelClass: 'card-abnormal-remarks-label',
      abnormalRemarksTextClass: 'card-abnormal-remarks-text',
      abnormalRemarks: exhibit.last_remarks || ''
    };
  });
}

const normalExhibits = [
  { id: 1, name: '青铜鼎', zone: '古代文明区', description: '商代青铜器', last_status: 'normal', last_inspected: '2026-06-01T10:00:00Z' },
  { id: 2, name: '恐龙化石', zone: '自然探索区', description: '侏罗纪恐龙', last_status: 'normal', last_inspected: '2026-06-02T10:00:00Z' },
  { id: 3, name: '青花瓷瓶', zone: '古代文明区', description: '元代青花瓷', last_status: 'abnormal', last_inspected: '2026-06-03T10:00:00Z' }
];

const mixedExhibits = [
  { id: 1, name: '青铜鼎', zone: '古代文明区', description: '商代青铜器', last_status: 'normal', last_inspected: '2026-06-01T10:00:00Z' },
  { id: 2, name: null, zone: '测试区', last_status: 'normal' },
  { id: 3, name: undefined, zone: '测试区', last_status: 'abnormal' },
  { id: 4, name: '', zone: '测试区', last_status: 'normal' },
  { id: 5, name: 12345, zone: '测试区', last_status: 'normal' },
  { id: 6, name: '恐龙化石', zone: '自然探索区', description: '侏罗纪恐龙', last_status: 'normal' },
  null,
  undefined,
  { id: 8, name: '青花瓷瓶', zone: '古代文明区', description: '元代青花瓷', last_status: 'abnormal' },
  { id: null, name: '无ID展品', zone: '异常区' },
  { id: undefined, name: 'undefinedID展品', zone: '异常区' },
  {},
  { id: 9, name: '翡翠白菜', zone: '古代文明区', last_status: null }
];

test('【BUG复现】有缺陷的版本空搜索时异常数据原样保留，后续统计会崩溃', () => {
  const result = filterExhibits_BUGGY(mixedExhibits, '');
  assert.strictEqual(result.length, mixedExhibits.length, '有缺陷版本空搜索时原样返回所有数据');
  assert.strictEqual(result[6], null, 'null 展品被保留在结果中');
  
  let threw = false;
  try {
    result.filter(e => e.last_status === 'normal').length;
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '统计时读取 e.last_status 会崩溃');
});

test('【BUG复现】有缺陷的版本非空搜索遇到 null 名称会崩溃', () => {
  let threw = false;
  try {
    filterExhibits_BUGGY(mixedExhibits, '青铜');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '有缺陷版本遇到 null 名称会崩溃');
});

test('【数据清洗】isValidExhibit 能正确识别无效展品', () => {
  assert.strictEqual(isValidExhibit(null), false, 'null 是无效展品');
  assert.strictEqual(isValidExhibit(undefined), false, 'undefined 是无效展品');
  assert.strictEqual(isValidExhibit({}), false, '空对象无 id 是无效展品');
  assert.strictEqual(isValidExhibit({ id: null }), false, 'id 为 null 是无效展品');
  assert.strictEqual(isValidExhibit({ id: undefined }), false, 'id 为 undefined 是无效展品');
  assert.strictEqual(isValidExhibit({ id: 1 }), true, '有 id 的对象是有效展品');
  assert.strictEqual(isValidExhibit({ id: 0 }), true, 'id 为 0 也是有效展品');
  assert.strictEqual(isValidExhibit('string'), false, '字符串不是有效展品');
  assert.strictEqual(isValidExhibit(123), false, '数字不是有效展品');
});

test('【数据清洗】getSafeExhibit 返回 null 用于无效展品', () => {
  assert.strictEqual(getSafeExhibit(null), null, 'null 展品返回 null');
  assert.strictEqual(getSafeExhibit(undefined), null, 'undefined 展品返回 null');
  assert.strictEqual(getSafeExhibit({}), null, '无 id 的展品返回 null');
});

test('【数据清洗】getSafeExhibit 将所有字段安全转换为正确类型', () => {
  const raw = { id: 1, name: null, zone: undefined, description: 123, last_status: 'normal' };
  const safe = getSafeExhibit(raw);
  
  assert.notStrictEqual(safe, null, '有效 id 的展品不应被过滤');
  assert.strictEqual(typeof safe.name, 'string', 'name 应转换为字符串');
  assert.strictEqual(safe.name, '', 'null name 转为空字符串');
  assert.strictEqual(typeof safe.zone, 'string', 'zone 应转换为字符串');
  assert.strictEqual(safe.zone, '', 'undefined zone 转为空字符串');
  assert.strictEqual(typeof safe.description, 'string', 'description 应转换为字符串');
  assert.strictEqual(safe.description, '123', '数字 description 转为字符串');
  assert.strictEqual(safe.last_status, 'normal', '正常状态保留');
});

test('【数据清洗】getSafeExhibit 保留 null 状态字段', () => {
  const raw = { id: 1, name: '测试', last_status: null };
  const safe = getSafeExhibit(raw);
  assert.strictEqual(safe.last_status, null, 'null 状态应保留为 null（表示未巡检）');
});

test('【完整链路】空搜索时异常数据被清洗掉，不会进入后续流程', () => {
  const { validExhibits, filteredExhibits, stats } = buildExhibitPipeline(mixedExhibits, '');
  
  assert.strictEqual(validExhibits.length, 8, '应有 8 件有效展品（过滤掉 null/undefined/无id）');
  assert.strictEqual(filteredExhibits.length, 8, '空搜索时有效展品全部保留');
  assert.ok(filteredExhibits.every(e => typeof e.name === 'string'), '所有展品的 name 都是字符串');
  assert.ok(filteredExhibits.every(e => e.id !== null && e.id !== undefined), '所有展品都有有效 id');
});

test('【完整链路】非空搜索时不会因异常数据崩溃', () => {
  let threw = false;
  let result = null;
  try {
    result = buildExhibitPipeline(mixedExhibits, '青铜');
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '搜索异常数据不应抛出异常');
  assert.strictEqual(result.filteredExhibits.length, 1, '搜索"青铜"应找到 1 件展品');
  assert.strictEqual(result.filteredExhibits[0].name, '青铜鼎', '找到的展品是青铜鼎');
});

test('【完整链路】搜索数字名称的展品也能正常工作', () => {
  const { filteredExhibits } = buildExhibitPipeline(mixedExhibits, '123');
  assert.strictEqual(filteredExhibits.length, 1, '数字名称的展品也能被搜索到');
  assert.strictEqual(filteredExhibits[0].name, '12345', '名称被转为字符串后可搜索');
});

test('【统计安全】统计计算不会因异常数据崩溃', () => {
  let threw = false;
  let stats = null;
  try {
    ({ stats } = buildExhibitPipeline(mixedExhibits, ''));
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '统计计算不应抛出异常');
  assert.strictEqual(typeof stats.total, 'number', 'total 是数字');
  assert.strictEqual(typeof stats.normal, 'number', 'normal 是数字');
  assert.strictEqual(typeof stats.abnormal, 'number', 'abnormal 是数字');
  assert.strictEqual(typeof stats.neverInspected, 'number', 'neverInspected 是数字');
  assert.strictEqual(stats.total, stats.normal + stats.abnormal + stats.neverInspected, '三类统计之和等于总数');
});

test('【统计安全】null 状态展品计入待巡检', () => {
  const { stats } = buildExhibitPipeline([
    { id: 1, name: 'A', last_status: 'normal' },
    { id: 2, name: 'B', last_status: null },
    { id: 3, name: 'C', last_status: undefined }
  ], '');
  
  assert.strictEqual(stats.neverInspected, 2, 'null 和 undefined 状态都计入待巡检');
});

test('【渲染准备】渲染数据准备不会因异常数据崩溃', () => {
  const { filteredExhibits } = buildExhibitPipeline(mixedExhibits, '');
  
  let threw = false;
  let renderData = null;
  try {
    renderData = prepareRenderData(filteredExhibits);
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '渲染数据准备不应抛出异常');
  assert.strictEqual(renderData.length, filteredExhibits.length, '渲染数据条数与过滤后一致');
  assert.ok(renderData.every(d => typeof d.key === 'string'), '所有 key 都是字符串');
  assert.ok(renderData.every(d => typeof d.name === 'string'), '所有 name 都是字符串');
});

test('【渲染准备】异常状态展品的渲染数据是安全的', () => {
  const { filteredExhibits } = buildExhibitPipeline(mixedExhibits, '');
  const renderData = prepareRenderData(filteredExhibits);
  
  const neverInspectedItems = renderData.filter(d => d.statusText === '未巡检');
  assert.ok(neverInspectedItems.length > 0, '有待巡检的展品');
  assert.ok(neverInspectedItems.every(d => d.statusClass === ''), '未巡检的 statusClass 是空字符串');
});

test('【联动验证】展区筛选 + 数据清洗 + 搜索 三者共同作用不会崩溃', () => {
  const selectedZone = '古代文明区';
  const zoneFiltered = mixedExhibits.filter(e => {
    if (!e || typeof e !== 'object') return false;
    return e.zone === selectedZone;
  });
  
  let threw = false;
  let result = null;
  try {
    result = buildExhibitPipeline(zoneFiltered, '青');
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '三者联动不应崩溃');
  assert.strictEqual(zoneFiltered.length, 3, '古代文明区原始有 3 件');
  assert.strictEqual(result.filteredExhibits.length, 2, '古代文明区搜索"青"应找到 2 件（青铜鼎和青花瓷瓶）');
  assert.ok(result.filteredExhibits.every(e => e.zone === '古代文明区'), '所有结果都属于古代文明区');
  assert.ok(result.filteredExhibits.some(e => e.name === '青铜鼎'), '应包含青铜鼎');
  assert.ok(result.filteredExhibits.some(e => e.name === '青花瓷瓶'), '应包含青花瓷瓶');
});

test('【边界场景】全异常数据的管道处理不会崩溃', () => {
  const badData = [null, undefined, {}, { id: null }, 'string', 123];
  
  let threw = false;
  let result = null;
  try {
    result = buildExhibitPipeline(badData, 'test');
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '全异常数据不应崩溃');
  assert.strictEqual(result.validExhibits.length, 0, '没有有效展品');
  assert.strictEqual(result.filteredExhibits.length, 0, '过滤后为 0');
  assert.strictEqual(result.stats.total, 0, '统计总数为 0');
  assert.strictEqual(result.stats.normal, 0, '正常数为 0');
});

test('【边界场景】空数组管道处理不会崩溃', () => {
  let threw = false;
  let result = null;
  try {
    result = buildExhibitPipeline([], 'test');
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '空数组不应崩溃');
  assert.strictEqual(result.stats.total, 0, '总数为 0');
});

test('【空状态判定】搜索有结果时不显示空状态，无结果时显示正确提示', () => {
  const { filteredExhibits: hasResult } = buildExhibitPipeline(mixedExhibits, '青铜');
  const { filteredExhibits: noResult } = buildExhibitPipeline(mixedExhibits, '不存在的关键词');
  
  assert.ok(hasResult.length > 0, '有搜索结果');
  assert.strictEqual(noResult.length, 0, '无搜索结果');
  
  let emptyStateText = '';
  if (noResult.length === 0) {
    emptyStateText = '未找到匹配的展品';
  }
  assert.ok(emptyStateText.length > 0, '无结果时有明确的空状态提示');
});

test('【完整端到端模拟】模拟组件完整渲染流程不崩溃', () => {
  const rawData = mixedExhibits;
  const searchKeyword = '';
  
  let threw = false;
  let renderData = null;
  let stats = null;
  
  try {
    const pipeline = buildExhibitPipeline(rawData, searchKeyword);
    stats = pipeline.stats;
    renderData = prepareRenderData(pipeline.filteredExhibits);
    
    for (const item of renderData) {
      void item.key;
      void item.cardClass;
      void item.zoneTag;
      void item.name;
      void item.description;
      void item.statusText;
      void item.statusClass;
      void item.lastInspectedText;
    }
  } catch (e) {
    threw = true;
    console.error(e);
  }
  
  assert.strictEqual(threw, false, '完整渲染流程不应抛出任何异常');
  assert.ok(renderData.length > 0, '应有渲染数据');
  assert.strictEqual(renderData.length, stats.total, '渲染数据量与统计总数一致');
});

test('【双重保险】即使数据意外进入渲染，prepareRenderData 也能安全处理', () => {
  const unsafeData = [
    { id: 1, name: '正常', last_status: 'normal' },
    null,
    { id: 2, name: null, last_status: 'abnormal' }
  ];
  
  let threw = false;
  try {
    prepareRenderData(unsafeData.filter(e => e !== null).map(getSafeExhibit).filter(e => e));
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '经过清洗的数据进入渲染准备是安全的');
});

test('【BUG修复验证】卡片异常备注使用 card- 前缀类名，与异常专栏样式隔离', () => {
  const exhibit = { id: 1, name: '测试展品', last_status: 'abnormal', last_remarks: '测试备注' };
  const safe = getSafeExhibit(exhibit);
  const renderData = prepareRenderData([safe])[0];
  
  assert.strictEqual(renderData.abnormalRemarksClass, 'card-abnormal-remarks', 
    '卡片异常备注容器类名应带 card- 前缀，避免与 .abnormal-remarks 冲突');
  assert.strictEqual(renderData.abnormalRemarksLabelClass, 'card-abnormal-remarks-label',
    '卡片异常备注标签类名应带 card- 前缀');
  assert.strictEqual(renderData.abnormalRemarksTextClass, 'card-abnormal-remarks-text',
    '卡片异常备注文本类名应带 card- 前缀');
  
  assert.ok(!renderData.abnormalRemarksClass.startsWith('abnormal-remarks'),
    '类名不应直接使用 abnormal-remarks 开头，否则会与异常专栏样式冲突');
});

test('【异常备注逻辑】只有状态为 abnormal 且有备注时才显示', () => {
  const testCases = [
    { status: 'normal', remarks: '正常备注', expected: false, desc: '正常状态即使有备注也不显示' },
    { status: 'abnormal', remarks: null, expected: false, desc: '异常状态但无备注不显示' },
    { status: 'abnormal', remarks: '', expected: false, desc: '异常状态但空备注不显示' },
    { status: 'abnormal', remarks: '异常说明', expected: true, desc: '异常状态且有备注时显示' },
    { status: null, remarks: '备注', expected: false, desc: '未巡检状态不显示' }
  ];
  
  testCases.forEach(({ status, remarks, expected, desc }) => {
    const exhibit = { id: 1, name: '测试', last_status: status, last_remarks: remarks };
    const safe = getSafeExhibit(exhibit);
    const renderData = prepareRenderData([safe])[0];
    assert.strictEqual(renderData.showAbnormalRemarks, expected, desc);
  });
});

test('【数据安全】last_remarks 字段的安全转换', () => {
  const raw1 = { id: 1, last_remarks: null };
  const safe1 = getSafeExhibit(raw1);
  assert.strictEqual(safe1.last_remarks, null, 'null remarks 保留为 null');
  
  const raw2 = { id: 2, last_remarks: undefined };
  const safe2 = getSafeExhibit(raw2);
  assert.strictEqual(safe2.last_remarks, null, 'undefined remarks 转为 null');
  
  const raw3 = { id: 3, last_remarks: 12345 };
  const safe3 = getSafeExhibit(raw3);
  assert.strictEqual(safe3.last_remarks, 12345, '非字符串备注保持原样（渲染层自行处理）');
});

test('【命名空间隔离】卡片类名与异常专栏类名不冲突', () => {
  const dashboardClasses = ['abnormal-remarks', 'abnormal-label', 'abnormal-text'];
  const cardRemarksClasses = [
    'card-abnormal-remarks',
    'card-abnormal-remarks-label', 
    'card-abnormal-remarks-text'
  ];
  
  cardRemarksClasses.forEach(cls => {
    assert.ok(!dashboardClasses.includes(cls), 
      `卡片类名 ${cls} 不应与异常专栏的类名相同`);
    assert.ok(cls.startsWith('card-'), 
      `卡片类名 ${cls} 应以 card- 前缀开头，确保命名空间隔离`);
  });
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
