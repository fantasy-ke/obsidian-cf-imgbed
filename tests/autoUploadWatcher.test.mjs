import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { build } from 'esbuild';

// 最小 obsidian 桩：监听器只用到 TFile / Notice / Modal / Setting。
const obsidianStub = `
export class TAbstractFile { constructor(p) { this.path = p; this.name = p.split('/').pop(); } }
export class TFile extends TAbstractFile {
	constructor(p) { super(p); const dot = this.name.lastIndexOf('.'); this.extension = dot >= 0 ? this.name.slice(dot + 1) : ''; this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name; }
}
export class Notice { constructor(message) { (globalThis.__notices ??= []).push(String(message)); } }
export class Modal { constructor(app) { this.app = app; this.contentEl = { empty() {}, createEl() { return {}; } }; } open() { globalThis.__openedModal = this; this.onOpen?.(); } close() {} }
export class Setting { constructor() {} addButton(cb) { cb({ setButtonText() { return this; }, setCta() { return this; }, onClick(fn) { (globalThis.__modalButtons ??= []).push(fn); return this; } }); return this; } }
export class Plugin {}
`;
const stubObsidian = {
	name: 'stub-obsidian',
	setup(builder) {
		builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
		builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: obsidianStub, loader: 'js' }));
	}
};

const buildDir = await mkdtemp(path.join(tmpdir(), 'cf-imgbed-watcher-test-'));
const bundlePath = path.join(buildDir, 'autoUploadWatcher.mjs');
after(() => rm(buildDir, { recursive: true, force: true }));
// 与监听器同一个 bundle 导出桩 TFile：监听器用 instanceof 判断，类必须是同一份
await build({
	stdin: {
		contents: "export * from './src/events/autoUploadWatcher.ts'; export { TFile } from 'obsidian';",
		resolveDir: process.cwd(),
		loader: 'js'
	},
	bundle: true,
	format: 'esm',
	platform: 'node',
	target: 'node18',
	outfile: bundlePath,
	plugins: [stubObsidian]
});
const { AutoUploadWatcher, resolveAutoUploadScope, isPathInScope, TFile } = await import(pathToFileURL(bundlePath).href);

AutoUploadWatcher.minDebounceMs = 10;
AutoUploadWatcher.retryDelaysMs = [15, 15];
globalThis.window ??= {}; // 让监听器注册 online 事件
const DEBOUNCE = 10;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createVault() {
	const handlers = {};
	const files = new Map();
	return {
		files,
		on(name, callback) {
			(handlers[name] ??= []).push(callback);
			return {};
		},
		emit(name, ...args) {
			for (const callback of handlers[name] ?? []) {
				callback(...args);
			}
		},
		add(filePath, content = '') {
			const file = new (this.TFileClass)(filePath);
			files.set(filePath, { file, content });
			return file;
		},
		getAbstractFileByPath(filePath) {
			return files.get(filePath)?.file ?? null;
		},
		getMarkdownFiles() {
			return Array.from(files.values()).map((entry) => entry.file).filter((file) => file.extension === 'md');
		},
		getFiles() {
			return Array.from(files.values()).map((entry) => entry.file);
		},
		async read(file) {
			return files.get(file.path).content;
		},
		async cachedRead(file) {
			return files.get(file.path).content;
		},
		async process(file, fn) {
			const entry = files.get(file.path);
			const next = fn(entry.content);
			if (next !== entry.content) {
				entry.content = next;
				this.emit('modify', file);
			}
			return next;
		}
	};
}

function createImageHandler({ delayMs = 0, unresolved = [], failUploads = 0, onCall = null } = {}) {
	return {
		calls: [],
		activeNow: 0,
		maxActive: 0,
		delayMs,
		unresolved,
		/** 前 N 次调用模拟网络失败：图片存在但上传失败 */
		failUploads,
		onCall,
		countUploadableImages(content) {
			return (content.match(/!\[\[local-[^\]]+\]\]/g) ?? []).length;
		},
		async uploadImagesInText(content, file, sourcePath, options) {
			this.calls.push({ content, sourcePath, options });
			// 先按调用时的状态决定结果（模拟真实解析发生在处理开始时），再触发 onCall
			const matches = content.match(/!\[\[local-[^\]]+\]\]/g) ?? [];
			const unresolvedLocal = this.unresolved.filter((name) => content.includes(name));
			const failThisCall = this.failUploads > 0;
			if (failThisCall) {
				this.failUploads--;
			}
			this.onCall?.(this.calls.length);
			this.activeNow++;
			this.maxActive = Math.max(this.maxActive, this.activeNow);
			if (this.delayMs > 0) {
				await sleep(this.delayMs);
			}
			this.activeNow--;
			if (failThisCall) {
				return { content, success: 0, failed: matches.length, skipped: 0, unresolvedLocal: [] };
			}
			const rewritten = content.replace(/!\[\[local-([^\]|]+)(?:\|[^\]]*)?\]\]/g, '![$1](https://img.example/$1)');
			return {
				content: rewritten,
				success: matches.length - unresolvedLocal.length,
				failed: unresolvedLocal.length,
				skipped: 0,
				unresolvedLocal
			};
		}
	};
}

async function setup(settingsOverrides = {}, handlerOptions = {}) {
	const vault = createVault();
	vault.TFileClass = TFile;
	const settings = {
		enableAutoUpload: true,
		autoUploadFolders: '',
		autoUploadWholeVault: false,
		autoUploadDebounceMs: DEBOUNCE,
		showUploadProgress: false,
		...settingsOverrides
	};
	const imageHandler = createImageHandler(handlerOptions);
	const domEvents = {};
	const plugin = {
		app: {
			vault,
			metadataCache: {
				// 与 Obsidian 一致：按链接路径解析；同名文件位于其他目录时只在链接是纯文件名时命中
				getFirstLinkpathDest(linkPath, sourcePath) {
					if (linkPath.includes('/')) {
						return vault.getAbstractFileByPath(linkPath);
					}
					const dir = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
					return vault.getAbstractFileByPath(dir ? `${dir}/${linkPath}` : linkPath)
						?? vault.getFiles().find((file) => file.name === linkPath) ?? null;
				}
			}
		},
		registerEvent() {},
		registerDomEvent(target, type, handler) {
			domEvents[type] = handler;
		}
	};
	const i18n = { t: (key, params) => `${key} ${JSON.stringify(params ?? {})}` };
	const watcher = new AutoUploadWatcher(plugin, imageHandler, () => settings, i18n);
	globalThis.__notices = [];
	globalThis.__modalButtons = [];
	return { vault, settings, imageHandler, watcher, domEvents };
}

test('scope resolution: empty folders without whole-vault means no watching', () => {
	assert.equal(resolveAutoUploadScope({ autoUploadFolders: '', autoUploadWholeVault: false }), null);
	assert.deepEqual(resolveAutoUploadScope({ autoUploadFolders: ' /inbox/, clippings ', autoUploadWholeVault: false }), { wholeVault: false, folders: ['inbox', 'clippings'] });
	assert.deepEqual(resolveAutoUploadScope({ autoUploadFolders: 'inbox', autoUploadWholeVault: true }), { wholeVault: true, folders: [] });
	const scope = { wholeVault: false, folders: ['inbox'] };
	assert.equal(isPathInScope('inbox/a.md', scope), true);
	assert.equal(isPathInScope('inbox-archive/a.md', scope), false);
	assert.equal(isPathInScope('notes/a.md', scope), false);
});

test('nothing is processed when no scope is configured, even with auto-upload enabled', async () => {
	const { vault, imageHandler, watcher } = await setup();
	watcher.register();
	const note = vault.add('notes/a.md', '![[local-a.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 4);
	assert.equal(imageHandler.calls.length, 0);
	assert.equal(vault.files.get('notes/a.md').content, '![[local-a.png]]');
});

test('only notes inside watched folders are processed; whole-vault mode processes everything', async () => {
	const scoped = await setup({ autoUploadFolders: 'inbox' });
	scoped.watcher.register();
	const inside = scoped.vault.add('inbox/a.md', '![[local-a.png]]');
	const outside = scoped.vault.add('notes/b.md', '![[local-b.png]]');
	scoped.vault.emit('modify', inside);
	scoped.vault.emit('modify', outside);
	await sleep(DEBOUNCE * 4);
	assert.deepEqual(scoped.imageHandler.calls.map((call) => call.sourcePath), ['inbox/a.md']);
	assert.equal(scoped.vault.files.get('inbox/a.md').content, '![a.png](https://img.example/a.png)');
	assert.equal(scoped.vault.files.get('notes/b.md').content, '![[local-b.png]]');
	assert.equal(scoped.imageHandler.calls[0].options.allowAbsolutePaths, false);

	const whole = await setup({ autoUploadWholeVault: true });
	whole.watcher.register();
	const note = whole.vault.add('notes/b.md', '![[local-b.png]]');
	whole.vault.emit('modify', note);
	await sleep(DEBOUNCE * 4);
	assert.equal(whole.vault.files.get('notes/b.md').content, '![b.png](https://img.example/b.png)');
});

test('a change made while a note is being processed triggers a re-run instead of being dropped', async () => {
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { delayMs: 40 });
	watcher.register();
	const note = vault.add('inbox/a.md', '![[local-a.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 2); // 进入处理中
	assert.equal(imageHandler.calls.length, 1);

	// 用户在上传期间追加了一张新图
	vault.files.get('inbox/a.md').content = '![[local-a.png]]\n![[local-b.png]]';
	vault.emit('modify', note);
	await sleep(120);

	// 第一次写回被条件拒绝（磁盘内容已变），内容不丢；重跑后两张图都完成
	assert.ok(imageHandler.calls.length >= 2, `expected a re-run, got ${imageHandler.calls.length} calls`);
	assert.equal(vault.files.get('inbox/a.md').content, '![a.png](https://img.example/a.png)\n![b.png](https://img.example/b.png)');
});

test('a note whose image has not landed yet is re-run when the image file is created', async () => {
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { unresolved: ['local-late.png'] });
	watcher.register();
	const note = vault.add('inbox/a.md', '![[local-late.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 4);
	assert.equal(imageHandler.calls.length, 1);
	assert.equal(vault.files.get('inbox/a.md').content, '![[local-late.png]]');

	imageHandler.unresolved = [];
	const image = vault.add('inbox/local-late.png');
	vault.emit('create', image);
	await sleep(DEBOUNCE * 4);
	assert.equal(imageHandler.calls.length, 2);
	assert.equal(vault.files.get('inbox/a.md').content, '![late.png](https://img.example/late.png)');
});

test('concurrent processing is capped and startup re-scans the watched scope', async () => {
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { delayMs: 20 });
	for (let i = 0; i < 6; i++) {
		vault.add(`inbox/n${i}.md`, `![[local-${i}.png]]`);
	}
	vault.add('notes/outside.md', '![[local-x.png]]');
	vault.add('inbox/drawing.excalidraw.md', '![[local-y.png]]');
	watcher.register(); // 启动补扫
	await sleep(150);
	assert.equal(imageHandler.calls.length, 6);
	assert.ok(imageHandler.maxActive <= AutoUploadWatcher.maxConcurrent, `max active was ${imageHandler.maxActive}`);
	assert.equal(vault.files.get('notes/outside.md').content, '![[local-x.png]]');
	assert.equal(vault.files.get('inbox/drawing.excalidraw.md').content, '![[local-y.png]]');
});

test('unload cancels pending work and late results are never written back', async () => {
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { delayMs: 40 });
	watcher.register();
	const note = vault.add('inbox/a.md', '![[local-a.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 2);
	assert.equal(imageHandler.calls.length, 1);
	watcher.unload();
	await sleep(80);
	assert.equal(vault.files.get('inbox/a.md').content, '![[local-a.png]]');
});

test('manual scan counts the scope, asks for confirmation, and processes even when auto-upload is off', async () => {
	const { vault, imageHandler, watcher } = await setup({ enableAutoUpload: false, autoUploadFolders: '' });
	watcher.register();
	vault.add('a.md', '![[local-a.png]]\n![[local-b.png]]');
	vault.add('b.md', 'no images');
	await watcher.scanAndMigrate();
	assert.ok(globalThis.__openedModal, 'confirmation modal should open');
	assert.equal(imageHandler.calls.length, 0, 'nothing runs before confirmation');

	// 第二个按钮是「确认」；范围内两篇笔记都会被处理（b.md 没有图片，处理后不写回）
	globalThis.__modalButtons[1]();
	await sleep(30);
	assert.deepEqual(imageHandler.calls.map((call) => call.sourcePath).sort(), ['a.md', 'b.md']);
	assert.equal(vault.files.get('b.md').content, 'no images');
	assert.equal(vault.files.get('a.md').content, '![a.png](https://img.example/a.png)\n![b.png](https://img.example/b.png)');
	assert.ok(globalThis.__notices.some((message) => message.startsWith('autoUpload.scanQueued')));
});

test('upload failures are retried with bounded backoff, then resumed by the online event', async () => {
	const { vault, imageHandler, watcher, domEvents } = await setup({ autoUploadFolders: 'inbox' }, { failUploads: 5 });
	watcher.register();
	const note = vault.add('inbox/a.md', '![[local-a.png]]');
	vault.emit('modify', note);
	await sleep(120);
	// 首次 + retryDelaysMs 长度（2）次重试 = 3 次后停止，不无限重试
	assert.equal(imageHandler.calls.length, 3);
	assert.equal(vault.files.get('inbox/a.md').content, '![[local-a.png]]');

	imageHandler.failUploads = 0;
	assert.ok(domEvents.online, 'online handler must be registered');
	domEvents.online();
	await sleep(DEBOUNCE * 4);
	assert.equal(imageHandler.calls.length, 4);
	assert.equal(vault.files.get('inbox/a.md').content, '![a.png](https://img.example/a.png)');
});

test('a manual scan keeps its manual flag across a write-back conflict even when auto-upload is off', async () => {
	const { vault, imageHandler, watcher } = await setup({ enableAutoUpload: false, autoUploadFolders: '' }, { delayMs: 30 });
	watcher.register();
	const note = vault.add('a.md', '![[local-a.png]]');
	await watcher.scanAndMigrate();
	globalThis.__modalButtons[1]();
	await sleep(10);
	// 处理期间用户改了笔记 → 条件写回失败 → 重跑必须仍以手动身份进行
	vault.files.get('a.md').content = '![[local-a.png]]\n![[local-b.png]]';
	vault.emit('modify', note);
	await sleep(120);
	assert.ok(imageHandler.calls.length >= 2);
	assert.equal(vault.files.get('a.md').content, '![a.png](https://img.example/a.png)\n![b.png](https://img.example/b.png)');
});

test('an image that lands while the note is being processed (before the wait is registered) is not missed', async () => {
	let ctx = null;
	const handlerOptions = {
		unresolved: ['local-late.png'],
		onCall: (n) => {
			if (n === 1) {
				// 图片在第一次处理期间落盘，create 事件此时还没有等待者
				const image = ctx.vault.add('inbox/local-late.png');
				ctx.vault.emit('create', image);
				ctx.imageHandler.unresolved = [];
			}
		}
	};
	ctx = await setup({ autoUploadFolders: 'inbox' }, handlerOptions);
	ctx.watcher.register();
	const note = ctx.vault.add('inbox/a.md', '![[local-late.png]]');
	ctx.vault.emit('modify', note);
	await sleep(DEBOUNCE * 6);
	assert.equal(ctx.imageHandler.calls.length, 2);
	assert.equal(ctx.vault.files.get('inbox/a.md').content, '![late.png](https://img.example/late.png)');
});

test('narrowing the scope while queued, or turning auto-upload off while processing, prevents the write-back', async () => {
	const narrowed = await setup({ autoUploadFolders: 'inbox' });
	narrowed.watcher.register();
	const note = narrowed.vault.add('inbox/a.md', '![[local-a.png]]');
	narrowed.vault.emit('modify', note);
	narrowed.settings.autoUploadFolders = 'other'; // 排队期间缩小范围
	await sleep(DEBOUNCE * 4);
	assert.equal(narrowed.imageHandler.calls.length, 0);
	assert.equal(narrowed.vault.files.get('inbox/a.md').content, '![[local-a.png]]');

	const switchedOff = await setup({ autoUploadFolders: 'inbox' }, { delayMs: 30 });
	switchedOff.watcher.register();
	const note2 = switchedOff.vault.add('inbox/b.md', '![[local-b.png]]');
	switchedOff.vault.emit('modify', note2);
	await sleep(DEBOUNCE * 2);
	assert.equal(switchedOff.imageHandler.calls.length, 1);
	switchedOff.settings.enableAutoUpload = false; // 处理期间关闭开关
	await sleep(60);
	assert.equal(switchedOff.vault.files.get('inbox/b.md').content, '![[local-b.png]]');
});

test('an unresolvable reference does not loop forever just because a same-named image exists elsewhere', async () => {
	// 引用 ./img/local-x.png 解析不到，但 archive/ 下有同名文件
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { unresolved: ['./img/local-x.png'] });
	watcher.register();
	vault.add('archive/local-x.png');
	const note = vault.add('inbox/a.md', '![[./img/local-x.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 12);
	assert.ok(imageHandler.calls.length <= 1, `expected no rerun, got ${imageHandler.calls.length}`);
	assert.equal(vault.files.get('inbox/a.md').content, '![[./img/local-x.png]]');
});

test('a note moved out of scope while it is being processed is not written back', async () => {
	const { vault, imageHandler, watcher } = await setup({ autoUploadFolders: 'inbox' }, { delayMs: 30 });
	watcher.register();
	const note = vault.add('inbox/a.md', '![[local-a.png]]');
	vault.emit('modify', note);
	await sleep(DEBOUNCE * 2);
	assert.equal(imageHandler.calls.length, 1);
	// 上传途中把笔记移到范围外目录（TFile.path 随之更新）
	const entry = vault.files.get('inbox/a.md');
	vault.files.delete('inbox/a.md');
	note.path = 'archive/a.md';
	vault.files.set('archive/a.md', entry);
	vault.emit('rename', note, 'inbox/a.md');
	await sleep(80);
	assert.equal(vault.files.get('archive/a.md').content, '![[local-a.png]]');
	assert.equal(imageHandler.calls.length, 1);
});
