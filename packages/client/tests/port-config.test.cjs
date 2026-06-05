const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n🧪 运行前后端端口配置一致性测试（防止端口不一致导致接口不可用）\n');

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

function extractPortFromServerConfig() {
  const serverIndexPath = path.join(__dirname, '..', '..', 'server', 'src', 'index.js');
  const content = fs.readFileSync(serverIndexPath, 'utf-8');
  const match = content.match(/const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*(\d+)/);
  if (!match) {
    throw new Error('无法从后端配置中提取默认端口号');
  }
  return parseInt(match[1], 10);
}

function extractPortFromViteConfig() {
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.js');
  const content = fs.readFileSync(viteConfigPath, 'utf-8');
  const match = content.match(/target:\s*['"]http:\/\/localhost:(\d+)['"]/);
  if (!match) {
    throw new Error('无法从 Vite 配置中提取代理目标端口号');
  }
  return parseInt(match[1], 10);
}

test('后端默认端口应为 3001', () => {
  const port = extractPortFromServerConfig();
  assert.strictEqual(port, 3001, `后端默认端口应为 3001，实际为 ${port}`);
});

test('前端 Vite 代理目标端口应为 3001', () => {
  const port = extractPortFromViteConfig();
  assert.strictEqual(port, 3001, `前端代理目标端口应为 3001，实际为 ${port}`);
});

test('【BUG修复验证】前端代理端口与后端默认端口必须一致', () => {
  const serverPort = extractPortFromServerConfig();
  const vitePort = extractPortFromViteConfig();
  assert.strictEqual(
    serverPort,
    vitePort,
    `前端代理端口(${vitePort}) 与后端默认端口(${serverPort}) 不一致，会导致开发环境 API 请求失败`
  );
});

console.log(`\n📊 测试结果: ${passed}/${passed + failed} 通过\n`);

if (failed > 0) {
  process.exit(1);
}
