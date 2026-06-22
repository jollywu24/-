import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function assertProjectFileExists(path) {
  assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
}

test('Pages 发布产物包含 Web 入口与运行时资源目录', () => {
  const workflow = readProjectFile('.github/workflows/deploy-pages.yml');

  assert.match(workflow, /Inject build SHA/);
  assert.match(workflow, /window\.__BUILD_SHA__ \\\|\\\| 'dev'/);
  assert.match(workflow, /mkdir -p dist-pages/);
  assert.match(workflow, /cp -R web dist-pages\/web/);
  assert.match(workflow, /cp -R art dist-pages\/art/);
  assert.match(workflow, /cp -R public dist-pages\/public/);
  assert.match(workflow, /path:\s+\.\/dist-pages/);
});

test('运行时代码暴露可定位的构建 SHA 调试信息', () => {
  const app = readProjectFile('web/app.js');

  assert.match(app, /window\.__BUILD_SHA__ \|\| 'dev'/);
  assert.match(app, /buildSha/);
  assert.match(app, /AbyssDebug/);
});

test('线上试玩关键资源路径存在于发布 artifact 对应目录', () => {
  const webRelativeAssetRefs = [
    '../art/shop.png',
    '../art/vfx/red-eye-awakening.png',
    '../art/vfx/red-eye-wager-seal.png',
    '../public/assets/ui/cards/deck_back.png',
    '../public/assets/ui/panel/game_table_bg.png',
    '../public/assets/ui/red-eye/red_eye_inactive.png',
    '../public/assets/ui/red-eye/red_eye_active.png',
    '../public/assets/ui/red-eye/red_eye_trigger.png',
    '../public/assets/ui/red-eye/red_eye_burst.png',
    '../public/assets/ui/stress-eye/stress_eye_cold.png',
    '../public/assets/ui/stress-eye/stress_eye_hot.png',
    '../public/assets/ui/stress-eye/stress_eye_red.png',
    '../public/assets/ui/stress-eye/stress_eye_overload.png',
    '../public/assets/ui/surge/surge_card_back.png',
    '../public/assets/ui/surge/surge_card_face_template.png',
    '../public/assets/ui/surge/surge_reveal_glow.png',
    '../public/assets/ui/surge/surge_unknown_back.png',
  ];

  for (const ref of webRelativeAssetRefs) {
    const artifactPath = ref.replace(/^\.\.\//, '');
    assertProjectFileExists(artifactPath);
  }
});

test('运行时代码仍通过 web 目录的相对路径引用发布资源', () => {
  const style = readProjectFile('web/style.css');
  const index = readProjectFile('web/index.html');
  const assetMap = readProjectFile('web/asset-map.js');

  assert.match(style, /\.\.\/art\/shop\.png/);
  assert.match(index, /\.\.\/art\/vfx\/red-eye-awakening\.png/);
  assert.match(index, /\.\.\/art\/vfx\/red-eye-wager-seal\.png/);
  assert.match(assetMap, /\.\.\/public\/assets\/ui/);
});
