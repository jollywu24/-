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
  assert.match(workflow, /Smoke check deployed Pages/);
  assert.match(workflow, /PAGE_URL/);
  assert.match(workflow, /curl --fail --silent --show-error --location --head/);
  assert.match(workflow, /\/web\/feedback\.html/);
  assert.match(workflow, /\/public\/assets\/ui\/cards\/deck_back\.png/);
  assert.match(workflow, /\/public\/assets\/ui\/panel\/game_table_bg\.png/);
  assert.match(workflow, /window\.__BUILD_SHA__ \|\| '\$short_sha'/);
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

test('公开试玩反馈入口可以收集版本、理解成本和愿望单意愿', () => {
  const issueForm = readProjectFile('.github/ISSUE_TEMPLATE/playtest_feedback.yml');
  const feedbackPage = readProjectFile('web/feedback.html');
  const readme = readProjectFile('README.md');

  assert.match(issueForm, /playtest/);
  assert.match(issueForm, /build_or_url/);
  assert.match(issueForm, /understood_loop/);
  assert.match(issueForm, /used_red_eye/);
  assert.match(issueForm, /restart_desire/);
  assert.match(issueForm, /wishlist_intent/);

  assert.match(feedbackPage, /playtest_feedback\.yml/);
  assert.match(feedbackPage, /试玩 URL/);
  assert.match(feedbackPage, /1000 个愿望单/);
  assert.match(readme, /https:\/\/jollywu24\.github\.io\/-\/web\//);
  assert.match(readme, /https:\/\/jollywu24\.github\.io\/-\/web\/feedback\.html/);
  assert.match(readme, /https:\/\/github\.com\/jollywu24\/-\/issues\/new\?template=playtest_feedback\.yml/);
});

test('Web MVP 测试工作流保护语法、规则、部署资源和浏览器流程', () => {
  const workflow = readProjectFile('.github/workflows/test-web.yml');

  assert.match(workflow, /name: Web MVP Tests/);
  assert.match(workflow, /actions\/setup-node@v4/);
  assert.match(workflow, /node-version: "22"/);
  assert.match(workflow, /CHROME_BIN/);
  assert.match(workflow, /node --check web\/app\.js/);
  assert.match(workflow, /node --check web\/logic-pure\.js/);
  assert.match(workflow, /node --check web\/round-rules\.js/);
  assert.match(workflow, /web\/tests\/logic-pure\.test\.mjs web\/tests\/architecture-modules\.test\.mjs web\/tests\/deploy-assets\.test\.mjs/);
  assert.match(workflow, /web\/tests\/browser-flow\.test\.mjs/);
  assert.match(workflow, /git diff --check HEAD\^ HEAD/);
});
