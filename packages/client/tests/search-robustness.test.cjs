const assert = require('assert');

console.log('\n🧪 运行搜索功能健壮性测试（验证异常数据下搜索不崩溃 bug 修复）\n');

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

function filterExhibits_BUGGY(exhibits, searchKeyword) {
  if (!searchKeyword.trim()) return exhibits;
  const keyword = searchKeyword.toLowerCase().trim();
  return exhibits.filter(exhibit => {
    return exhibit.name.toLowerCase().includes(keyword);
  });
}

function filterExhibits_FIXED(exhibits, searchKeyword) {
  if (!searchKeyword.trim()) return exhibits;
  const keyword = searchKeyword.toLowerCase().trim();
  return exhibits.filter(exhibit => {
    const exhibitName = exhibit && exhibit.name ? String(exhibit.name) : '';
    return exhibitName.toLowerCase().includes(keyword);
  });
}

const normalExhibits = [
  { id: 1, name: '青铜鼎', zone: '古代文明区', last_status: 'normal' },
  { id: 2, name: '恐龙化石', zone: '自然探索区', last_status: 'normal' },
  { id: 3, name: '青花瓷瓶', zone: '古代文明区', last_status: 'abnormal' }
];

const mixedExhibits = [
  { id: 1, name: '青铜鼎', zone: '古代文明区', last_status: 'normal' },
  { id: 2, name: null, zone: '测试区', last_status: 'normal' },
  { id: 3, name: undefined, zone: '测试区', last_status: 'abnormal' },
  { id: 4, name: '', zone: '测试区', last_status: 'normal' },
  { id: 5, name: 12345, zone: '测试区', last_status: 'normal' },
  { id: 6, name: '恐龙化石', zone: '自然探索区', last_status: 'normal' },
  null,
  undefined,
  { id: 8, name: '青花瓷瓶', zone: '古代文明区', last_status: 'abnormal' }
];

test('【正常场景】修复后搜索正常展品能正确过滤', () => {
  const result = filterExhibits_FIXED(normalExhibits, '青铜');
  assert.strictEqual(result.length, 1, '搜索"青铜"应找到 1 件展品');
  assert.strictEqual(result[0].name, '青铜鼎', '找到的展品应是青铜鼎');
});

test('【正常场景】空搜索关键词返回所有展品', () => {
  const result = filterExhibits_FIXED(normalExhibits, '');
  assert.strictEqual(result.length, 3, '空关键词应返回所有 3 件展品');
});

test('【正常场景】搜索不区分大小写', () => {
  const result1 = filterExhibits_FIXED(normalExhibits, '恐龙');
  const result2 = filterExhibits_FIXED(normalExhibits, 'KONG龙');
  assert.strictEqual(result1.length, 1, '中文搜索应找到');
  assert.strictEqual(result2.length, 0, '拼音搜索不应找到');
});

test('【BUG复现】有缺陷的搜索在遇到 null 名称时会抛出异常', () => {
  let threw = false;
  try {
    filterExhibits_BUGGY(mixedExhibits, '青铜');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '有缺陷的版本遇到 null 名称时应抛出异常（这就是 bug）');
});

test('【BUG复现】有缺陷的搜索在遇到 undefined 名称时会抛出异常', () => {
  let threw = false;
  try {
    filterExhibits_BUGGY([{ id: 1, name: undefined }], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '有缺陷的版本遇到 undefined 名称时应抛出异常');
});

test('【BUG复现】有缺陷的搜索在遇到数字名称时会抛出异常', () => {
  let threw = false;
  try {
    filterExhibits_BUGGY([{ id: 1, name: 123 }], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '有缺陷的版本遇到数字名称时应抛出异常');
});

test('【BUG复现】有缺陷的搜索在遇到 null 展品时会抛出异常', () => {
  let threw = false;
  try {
    filterExhibits_BUGGY([null], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, '有缺陷的版本遇到 null 展品时应抛出异常');
});

test('【BUG修复验证】修复后搜索遇到 null 名称不会崩溃', () => {
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED(mixedExhibits, '青铜');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '修复后遇到 null 名称不应抛出异常');
  assert.strictEqual(result.length, 1, '搜索"青铜"应找到 1 件正常展品');
  assert.strictEqual(result[0].name, '青铜鼎', '找到的展品应是青铜鼎');
});

test('【BUG修复验证】修复后搜索遇到 undefined 名称不会崩溃', () => {
  let threw = false;
  try {
    filterExhibits_FIXED([{ id: 1, name: undefined }], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '修复后遇到 undefined 名称不应抛出异常');
});

test('【BUG修复验证】修复后搜索遇到数字名称不会崩溃', () => {
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED([{ id: 1, name: 12345 }], '123');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '修复后遇到数字名称不应抛出异常');
  assert.strictEqual(result.length, 1, '数字名称转换为字符串后也能搜索');
});

test('【BUG修复验证】修复后搜索遇到空字符串名称不会崩溃', () => {
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED([{ id: 1, name: '' }], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '修复后遇到空字符串名称不应抛出异常');
  assert.strictEqual(result.length, 0, '空名称不应匹配任何搜索关键词');
});

test('【BUG修复验证】修复后搜索遇到 null 展品不会崩溃', () => {
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED([null, undefined, { id: 1, name: '测试' }], '测试');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '修复后遇到 null/undefined 展品不应抛出异常');
  assert.strictEqual(result.length, 1, '应正确过滤掉 null/undefined 展品');
});

test('【BUG修复验证】修复后搜索混合异常数据能正确过滤正常展品', () => {
  const result = filterExhibits_FIXED(mixedExhibits, '化');
  assert.strictEqual(result.length, 1, '搜索"化"应找到 1 件展品（恐龙化石）');
  assert.strictEqual(result[0].name, '恐龙化石', '找到的展品应是恐龙化石');
});

test('【BUG修复验证】修复后空关键词时所有有效展品都保留', () => {
  const result = filterExhibits_FIXED(mixedExhibits, '');
  assert.strictEqual(result.length, mixedExhibits.length, '空关键词时应返回原始数组（不改变长度）');
});

test('【边界场景】空数组搜索不会崩溃', () => {
  let threw = false;
  let result = null;
  try {
    result = filterExhibits_FIXED([], 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '空数组搜索不应抛出异常');
  assert.strictEqual(result.length, 0, '空数组搜索结果为空');
});

test('【边界场景】全是异常数据的数组搜索不会崩溃', () => {
  const badData = [null, undefined, {}, { id: 1 }, { id: 2, name: null }];
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED(badData, 'test');
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, '全异常数据搜索不应抛出异常');
  assert.strictEqual(result.length, 0, '全异常数据搜索结果为空');
});

test('【统计数据验证】过滤后的统计数据计算不会因异常数据崩溃', () => {
  const result = filterExhibits_FIXED(mixedExhibits, '');
  const stats = {
    total: result.length,
    normal: result.filter(e => e && e.last_status === 'normal').length,
    abnormal: result.filter(e => e && e.last_status === 'abnormal').length,
    neverInspected: result.filter(e => e && !e.last_status).length
  };
  assert.strictEqual(stats.total, mixedExhibits.length, '总数应等于原数组长度');
  assert.ok(stats.normal >= 0, '正常数量不应为负数');
  assert.ok(stats.abnormal >= 0, '异常数量不应为负数');
});

test('【联动验证】展区筛选 + 搜索 + 异常数据三者共同作用不会崩溃', () => {
  const zones = ['古代文明区', '自然探索区', '测试区'];
  const selectedZone = '古代文明区';
  
  let zoneFiltered = mixedExhibits.filter(e => e && e.zone === selectedZone);
  
  let threw = false;
  let result = [];
  try {
    result = filterExhibits_FIXED(zoneFiltered, '青');
  } catch (e) {
    threw = true;
  }
  
  assert.strictEqual(threw, false, '展区筛选后再搜索不应崩溃');
  assert.strictEqual(zoneFiltered.length, 2, '古代文明区应有 2 件正常展品');
  assert.strictEqual(result.length, 2, '古代文明区搜索"青"应找到 2 件展品（青铜鼎和青花瓷瓶）');
  assert.ok(result.some(e => e.name === '青铜鼎'), '应包含青铜鼎');
  assert.ok(result.some(e => e.name === '青花瓷瓶'), '应包含青花瓷瓶');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
