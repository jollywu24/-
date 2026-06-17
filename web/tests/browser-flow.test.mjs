import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
      let filePath = join(projectRoot, relative);
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
      response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function waitForDevTools(chrome) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome DevTools 启动超时')), 10000);
    chrome.stderr.setEncoding('utf8');
    chrome.stderr.on('data', (chunk) => {
      const match = chunk.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (!match) return;
      clearTimeout(timer);
      resolve(Number(match[1]));
    });
    chrome.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome 提前退出，状态码 ${code}`));
    });
  });
}

async function waitForPageTarget(port) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()).catch(() => []);
    const page = targets.find((target) => target.type === 'page');
    if (page) return page.webSocketDebuggerUrl;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('未找到浏览器页面目标');
}

function connectCdp(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const events = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      events.push(message);
      return;
    }
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve({
        close: () => socket.close(),
        events,
        send(method, params = {}) {
          return new Promise((commandResolve, commandReject) => {
            const id = ++nextId;
            pending.set(id, { resolve: commandResolve, reject: commandReject });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
      });
    }, { once: true });
    socket.addEventListener('error', () => reject(new Error('无法连接 Chrome DevTools')), { once: true });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(cdp, expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const diagnostics = await evaluate(cdp, `JSON.stringify({
    url: location.href,
    readyState: document.readyState,
    handCards: document.querySelectorAll('.hand-card[data-deck-id]').length,
    drawingCards: document.querySelectorAll('.drawing-card').length,
    scripts: [...document.scripts].map((script) => script.src)
  })`);
  throw new Error(`等待条件超时：${expression}\n${diagnostics}\n${JSON.stringify(cdp.events.slice(-5))}`);
}

const snapshotExpression = `(() => ({
  cards: [...document.querySelectorAll('.hand-card[data-deck-id]')].map((card) => card.dataset.deckId),
  selected: document.querySelectorAll('.hand-card.selected').length,
  handCount: document.querySelector('.hand-count').textContent.trim(),
  deckCount: document.querySelector('.deck-count').textContent.trim(),
  showdownCount: document.querySelectorAll('.count-stack strong')[0].textContent.trim(),
  discardCount: document.querySelectorAll('.count-stack strong')[1].textContent.trim()
}))()`;

async function withBrowser(pathAndQuery, callback) {
  const server = await startServer();
  const profileDir = await mkdtemp(join(tmpdir(), 'abyss-browser-test-'));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}${pathAndQuery}`;
  const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    url,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let cdp;
  try {
    const devToolsPort = await waitForDevTools(chrome);
    cdp = await connectCdp(await waitForPageTarget(devToolsPort));
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await callback(cdp, url);
  } finally {
    cdp?.close();
    chrome.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    if (chrome.exitCode === null) {
      chrome.kill('SIGKILL');
      await new Promise((resolve) => chrome.once('exit', resolve));
    }
    await new Promise((resolve) => server.close(resolve));
    await rm(profileDir, { recursive: true, force: true });
  }
}

test('固定 seed 浏览器流程保持初始化、换牌和摊牌行为', { timeout: 40000 }, async () => {
  const server = await startServer();
  const profileDir = await mkdtemp(join(tmpdir(), 'abyss-browser-test-'));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/web/?seed=flow-regression`;
  const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    url,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let cdp;
  try {
    const devToolsPort = await waitForDevTools(chrome);
    cdp = await connectCdp(await waitForPageTarget(devToolsPort));
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await waitFor(cdp, `document.readyState === 'complete' && document.querySelectorAll('.hand-card[data-deck-id]').length === 8 && !document.querySelector('.drawing-card')`);

    const initial = await evaluate(cdp, snapshotExpression);
    assert.equal(initial.handCount, '8 / 8');
    assert.equal(initial.deckCount, '剩余 44 张');
    assert.equal(initial.showdownCount, '3 / 3');
    assert.equal(initial.discardCount, '2 / 2');
    assert.deepEqual(initial.cards, [
      'toxic-14',
      'kinetic-11',
      'pulse-11',
      'thermal-9',
      'kinetic-7',
      'pulse-5',
      'thermal-4',
      'thermal-3',
    ]);

    await evaluate(cdp, `[...document.querySelectorAll('.hand-card[data-uid]')].slice(0, 2).forEach((card) => card.click())`);
    assert.equal((await evaluate(cdp, snapshotExpression)).selected, 2);
    await evaluate(cdp, `document.querySelector('.discard-button').click()`);
    await waitFor(cdp, `document.querySelectorAll('.count-stack strong')[1].textContent.trim() === '1 / 2' && !document.querySelector('.drawing-card')`);

    const afterDiscard = await evaluate(cdp, snapshotExpression);
    assert.equal(afterDiscard.handCount, '8 / 8');
    assert.equal(afterDiscard.deckCount, '剩余 42 张');
    assert.equal(afterDiscard.selected, 0);

    await evaluate(cdp, `[...document.querySelectorAll('.hand-card[data-uid]')].slice(0, 5).forEach((card) => card.click())`);
    await evaluate(cdp, `document.querySelector('.showdown-button').click()`);
    await waitFor(cdp, `document.querySelectorAll('.count-stack strong')[0].textContent.trim() === '2 / 3' && !document.querySelector('.drawing-card')`, 20000);
    assert.equal((await evaluate(cdp, snapshotExpression)).handCount, '8 / 8');

    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url });
    await waitFor(cdp, `document.readyState === 'complete' && document.querySelectorAll('.hand-card[data-deck-id]').length === 8 && !document.querySelector('.drawing-card')`);
    assert.deepEqual((await evaluate(cdp, snapshotExpression)).cards, initial.cards);
    assert.equal(cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown').length, 0);
  } finally {
    cdp?.close();
    chrome.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => chrome.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    if (chrome.exitCode === null) {
      chrome.kill('SIGKILL');
      await new Promise((resolve) => chrome.once('exit', resolve));
    }
    await new Promise((resolve) => server.close(resolve));
    await rm(profileDir, { recursive: true, force: true });
  }
});

test('调试流程覆盖红眼下注、通关结算、商店和爆牌失败', { timeout: 60000 }, async () => {
  await withBrowser('/web/?seed=flow-branches&debug=1', async (cdp) => {
    await waitFor(cdp, `window.AbyssDebug && document.readyState === 'complete' && document.querySelectorAll('.hand-card[data-deck-id]').length === 8 && !document.querySelector('.drawing-card')`);

    await evaluate(cdp, `window.AbyssDebug.setTilt(100)`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().redEyeUnlocked === true`);
    await evaluate(cdp, `document.querySelector('.red-eye-entry').click()`);
    await waitFor(cdp, `document.querySelector('.red-eye-modal').classList.contains('show')`);
    await evaluate(cdp, `document.querySelector('.red-eye-option-card').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().activeRedEyeBet !== null && !document.querySelector('.red-eye-modal').classList.contains('show')`);

    await evaluate(cdp, `window.AbyssDebug.setTargetScore(1); window.AbyssDebug.selectFirstCards(1);`);
    await evaluate(cdp, `document.querySelector('.showdown-button').click()`);
    await waitFor(cdp, `document.querySelector('.round-clear-overlay').classList.contains('show') && !document.querySelector('.round-clear-continue').disabled`, 25000);
    const clearSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(clearSnapshot.phase, 'roundClear');
    assert.equal(clearSnapshot.activeRedEyeBet, null);
    assert.equal(clearSnapshot.redEyeUsedThisRound, true);
    assert.equal(clearSnapshot.roundClearVisible, true);

    await evaluate(cdp, `document.querySelector('.round-clear-continue').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().phase === 'shop' && document.querySelector('.shop-stage').classList.contains('show')`, 20000);
    const shopSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(shopSnapshot.shopVisible, true);
    assert.equal(shopSnapshot.phase, 'shop');

    await evaluate(cdp, `window.AbyssDebug.setStake(50)`);
    await evaluate(cdp, `document.querySelector('button[data-shop-buy-ghost]').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().ownedGhostCount === 1 && document.querySelectorAll('.owned-ghost-card').length === 1`);
    await evaluate(cdp, `document.querySelector('button[data-shop-pack]').click()`);
    await waitFor(cdp, `document.querySelectorAll('.shop-pack-product.shop-product-sold').length >= 1`);

    await evaluate(cdp, `document.querySelector('.shop-next-button').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().phase === 'playing' && window.AbyssDebug.snapshot().roundIndex === 1 && !document.querySelector('.shop-stage').classList.contains('show') && !document.querySelector('.drawing-card')`, 25000);
    const nextRoundSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(nextRoundSnapshot.roundIndex, 1);
    assert.equal(nextRoundSnapshot.redEyeUsedThisRound, false);
    assert.equal(nextRoundSnapshot.activeRedEyeBet, null);

    await evaluate(cdp, `window.AbyssDebug.setTargetScore(999999); window.AbyssDebug.setTilt(159); window.AbyssDebug.selectFirstCards(1);`);
    await evaluate(cdp, `document.querySelector('.showdown-button').click()`);
    await waitFor(cdp, `document.querySelector('.failure-overlay').classList.contains('show')`, 25000);
    const failureSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(failureSnapshot.phase, 'failed');
    assert.equal(failureSnapshot.failureType, 'bustCard');
    assert.equal(failureSnapshot.failureTitle, '爆牌');

    await evaluate(cdp, `document.querySelector('.failure-restart').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().phase === 'playing' && window.AbyssDebug.snapshot().currentScore === 0 && window.AbyssDebug.snapshot().currentTilt === 0 && document.querySelectorAll('.hand-card[data-deck-id]').length === 8 && !document.querySelector('.failure-overlay').classList.contains('show') && !document.querySelector('.drawing-card')`, 25000);
    const restartedSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(restartedSnapshot.roundIndex, 0);
    assert.equal(restartedSnapshot.showdownsLeft, 3);

    await evaluate(cdp, `window.AbyssDebug.setTargetScore(999999); window.AbyssDebug.setShowdownsLeft(1); window.AbyssDebug.selectFirstCards(1);`);
    await evaluate(cdp, `document.querySelector('.showdown-button').click()`);
    await waitFor(cdp, `document.querySelector('.failure-overlay').classList.contains('show') && window.AbyssDebug.snapshot().failureType === 'houseTakes'`, 25000);
    const houseSnapshot = await evaluate(cdp, `window.AbyssDebug.snapshot()`);
    assert.equal(houseSnapshot.phase, 'failed');
    assert.equal(houseSnapshot.failureTitle, '庄家通吃');

    await evaluate(cdp, `document.querySelector('.failure-restart').click()`);
    await waitFor(cdp, `window.AbyssDebug.snapshot().phase === 'playing' && window.AbyssDebug.snapshot().currentScore === 0 && window.AbyssDebug.snapshot().showdownsLeft === 3 && document.querySelectorAll('.hand-card[data-deck-id]').length === 8 && !document.querySelector('.failure-overlay').classList.contains('show') && !document.querySelector('.drawing-card')`, 25000);
  });
});
