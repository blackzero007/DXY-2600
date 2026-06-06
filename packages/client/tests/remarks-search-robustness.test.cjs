const assert = require('assert');

console.log('\n🧪 运行巡检历史备注搜索参数健壮性测试\n');

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

function safeTrim(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item !== null && item !== undefined) {
        const str = String(item).trim();
        if (str.length > 0) {
          return str;
        }
      }
    }
    return null;
  }
  return String(value).trim();
}

function buildInspectionsUrl(zone = null, status = null, sortBy = 'created_at', sortOrder = 'desc', remarksKeyword = null) {
  const params = [];
  if (zone) {
    params.push(`zone=${encodeURIComponent(zone)}`);
  }
  if (status) {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  if (sortBy) {
    params.push(`sortBy=${encodeURIComponent(sortBy)}`);
  }
  if (sortOrder) {
    params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
  }
  const safeKeyword = safeTrim(remarksKeyword);
  if (safeKeyword) {
    params.push(`remarksKeyword=${encodeURIComponent(safeKeyword)}`);
  }
  return params.length > 0 ? `/inspections?${params.join('&')}` : '/inspections';
}

test('safeTrim: 普通字符串正常去除首尾空格', () => {
  assert.strictEqual(safeTrim('  损伤  '), '损伤');
  assert.strictEqual(safeTrim('良好'), '良好');
});

test('safeTrim: null 返回 null', () => {
  assert.strictEqual(safeTrim(null), null);
});

test('safeTrim: undefined 返回 null', () => {
  assert.strictEqual(safeTrim(undefined), null);
});

test('safeTrim: 空字符串返回空字符串', () => {
  assert.strictEqual(safeTrim(''), '');
  assert.strictEqual(safeTrim('   '), '');
});

test('【BUG修复验证】safeTrim: 数组类型取第一个非空元素（首空后续有效场景）', () => {
  assert.strictEqual(safeTrim(['', '损伤']), '损伤');
  assert.strictEqual(safeTrim(['', '', '修复']), '修复');
  assert.strictEqual(safeTrim(['  ', '  良好  ']), '良好');
  assert.strictEqual(safeTrim(['', '  一般  ', '优秀']), '一般');
});

test('【BUG修复验证】safeTrim: 数组全为空字符串时返回 null', () => {
  assert.strictEqual(safeTrim(['', '']), null);
  assert.strictEqual(safeTrim(['  ', '', '   ']), null);
});

test('【BUG修复验证】safeTrim: 空数组返回 null', () => {
  assert.strictEqual(safeTrim([]), null);
});

test('【BUG修复验证】safeTrim: 数字类型安全转换', () => {
  assert.strictEqual(safeTrim(123), '123');
  assert.strictEqual(safeTrim(0), '0');
});

test('【BUG修复验证】safeTrim: 对象类型安全转换', () => {
  const result = safeTrim({ foo: 'bar' });
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('object') || result === '[object Object]');
});

test('buildInspectionsUrl: 仅含默认排序参数', () => {
  const url = buildInspectionsUrl();
  assert.ok(url.includes('sortBy=created_at'), '应包含默认 sortBy 参数');
  assert.ok(url.includes('sortOrder=desc'), '应包含默认 sortOrder 参数');
  assert.ok(!url.includes('remarksKeyword'), '不应包含 remarksKeyword 参数');
});

test('buildInspectionsUrl: 正常字符串 remarksKeyword 正确拼接', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', '损伤');
  assert.ok(url.includes('remarksKeyword=%E6%8D%9F%E4%BC%A4'), 'URL 应包含编码后的 remarksKeyword 参数');
});

test('【BUG修复验证】buildInspectionsUrl: 数组 remarksKeyword 首元素为空时取后续有效值', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', ['', '损伤']);
  assert.ok(url.includes('remarksKeyword=%E6%8D%9F%E4%BC%A4'), '数组首元素为空时应取后续第一个有效值');
});

test('【BUG修复验证】buildInspectionsUrl: 数组 remarksKeyword 多个空元素后取有效值', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', ['', '  ', '良好']);
  assert.ok(url.includes('remarksKeyword=%E8%89%AF%E5%A5%BD'), '多个空元素后应取第一个有效值');
  assert.ok(url.includes('%E8%89%AF%E5%A5%BD'), '值应自动 trim 后编码');
});

test('【BUG修复验证】buildInspectionsUrl: 数组 remarksKeyword 全为空时不添加参数', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', ['', '', '  ']);
  assert.strictEqual(url, '/inspections?sortBy=created_at&sortOrder=desc');
  assert.ok(!url.includes('remarksKeyword'), '数组全为空时不应添加 remarksKeyword 参数');
});

test('【BUG修复验证】buildInspectionsUrl: 空数组 remarksKeyword 不添加参数', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', []);
  assert.strictEqual(url, '/inspections?sortBy=created_at&sortOrder=desc');
  assert.ok(!url.includes('remarksKeyword'), '空数组不应添加 remarksKeyword 参数');
});

test('【BUG修复验证】buildInspectionsUrl: null remarksKeyword 不添加参数', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', null);
  assert.ok(!url.includes('remarksKeyword'), 'null 不应添加 remarksKeyword 参数');
});

test('【BUG修复验证】buildInspectionsUrl: 数字 remarksKeyword 不崩溃', () => {
  const url = buildInspectionsUrl(null, null, 'created_at', 'desc', 12345);
  assert.ok(url.includes('remarksKeyword=12345'), '数字参数应能正常转换');
});

test('【BUG修复验证】buildInspectionsUrl: 所有参数均为数组时不崩溃', () => {
  const url = buildInspectionsUrl(
    ['古代文明区', '艺术画廊'],
    ['normal', 'abnormal'],
    ['exhibit_name', 'created_at'],
    ['asc', 'desc'],
    ['损伤', '修复']
  );
  assert.ok(url.startsWith('/inspections?'), '应返回有效的 URL');
  assert.ok(url.includes('zone='), '应包含 zone 参数');
  assert.ok(url.includes('remarksKeyword='), '应包含 remarksKeyword 参数');
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
