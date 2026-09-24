import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { build } from 'esbuild';

globalThis.File = NodeFile;

const obsidianStub = `
export class TFile { constructor(p) { this.path = p; this.name = p.split('/').pop(); this.extension = this.name.split('.').pop(); } }
export class Notice { constructor(message) { (globalThis.__notices ??= []).push(String(message)); } }
export class MarkdownView {}
export const Platform = { isMobile: false };
export const requestUrl = () => { throw new Error('network disabled in test'); };
`;
const stubObsidian = {
	name: 'stub-obsidian',
	setup(builder) {
		builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'stub' }));
		builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: obsidianStub, loader: 'js' }));
	}
};

const buildDir = await mkdtemp(path.join(tmpdir(), 'cf-imgbed-handler-test-'));
after(() => rm(buildDir, { recursive: true, force: true }));
async function bundle(entry, name, stdin) {
	const outfile = path.join(buildDir, name);
	await build({
		...(stdin ? { stdin: { contents: stdin, resolveDir: process.cwd(), loader: 'js' } } : { entryPoints: [path.resolve(entry)] }),
		bundle: true,
		format: 'esm',
		platform: 'node',
		target: 'node18',
		outfile,
		plugins: [stubObsidian]
	});
	return import(pathToFileURL(outfile).href);
}
// 同一个 bundle 导出桩 TFile，保证 imageHandler 内部的 instanceof 判断能命中
const { ImageHandler, TFile } = await bundle(null, 'imageHandler.mjs',
	"export { ImageHandler } from './src/upload/imageHandler.ts'; export { TFile } from 'obsidian';");

// 让 globalThis.require('fs') 可被探测：记录是否有人尝试读库外文件
let absoluteReads = 0;
globalThis.require = (name) => (name === 'fs' ? { readFileSync: () => { absoluteReads++; return new Uint8Array([1]); } } : null);

function createApp(vaultFiles) {
	const byPath = new Map(vaultFiles.map((p) => [p, new TFile(p)]));
	return {
		vault: {
			getAbstractFileByPath: (p) => byPath.get(p) ?? null,
			readBinary: async () => new Uint8Array([9, 9, 9]).buffer,
			adapter: { getBasePath: () => 'C:/vault' }
		},
		metadataCache: {
			getFirstLinkpathDest: (linkPath) => byPath.get(linkPath) ?? byPath.get(`attachments/${linkPath}`) ?? null
		},
		workspace: { getActiveFile: () => null, getActiveViewOfType: () => null }
	};
}

function createHandler(vaultFiles, settings = {}) {
	const uploadService = {
		uploads: [],
		async uploadImage(file) {
			this.uploads.push(file.name);
			return `https://img.example/${file.name}`;
		}
	};
	const handler = new ImageHandler(createApp(vaultFiles), uploadService, () => ({
		apiUrl: 'https://img.example',
		excludedImageDomains: [],
		enableNetworkImageUpload: false,
		...settings
	}));
	return { handler, uploadService };
}

test('auto mode uploads vault images but skips absolute paths outside the vault', async () => {
	const { handler, uploadService } = createHandler(['attachments/in-vault.png']);
	const note = new TFile('notes/a.md');
	const content = '![[in-vault.png]]\n![outside](C:/Users/me/secret.png)\n![in vault abs](C:/vault/attachments/in-vault.png)';
	absoluteReads = 0;

	const result = await handler.uploadImagesInText(content, note, note.path, { allowAbsolutePaths: false });

	assert.equal(result.success, 2);
	assert.equal(result.skipped, 1);
	assert.equal(result.failed, 0);
	assert.equal(absoluteReads, 0, 'must not read files outside the vault in auto mode');
	assert.deepEqual(uploadService.uploads, ['in-vault.png', 'in-vault.png']);
	assert.equal(result.content, '![in-vault.png](https://img.example/in-vault.png)\n![outside](C:/Users/me/secret.png)\n![in vault abs](https://img.example/in-vault.png)');
});

test('manual mode (default) still reads absolute paths, keeping the existing command behaviour', async () => {
	const { handler } = createHandler([]);
	const note = new TFile('notes/a.md');
	absoluteReads = 0;
	const result = await handler.uploadImagesInText('![outside](C:/Users/me/pic.png)', note, note.path);
	assert.equal(absoluteReads, 1);
	assert.equal(result.success, 1);
});

test('unresolved vault images are reported so the watcher can wait for them; bad percent-encoding does not throw', async () => {
	const { handler } = createHandler([]);
	const note = new TFile('notes/a.md');
	const result = await handler.uploadImagesInText('![[not-yet.png]]\n![x](bad%zz.png)', note, note.path, { allowAbsolutePaths: false });
	assert.equal(result.success, 0);
	assert.equal(result.failed, 2);
	assert.deepEqual(result.unresolvedLocal, ['not-yet.png', 'bad%zz.png']);
	assert.equal(handler.countUploadableImages('![[a.png]] ![b](https://elsewhere.com/b.png) ![c](https://img.example/c.png)'), 1);
});
