import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { build } from 'esbuild';

globalThis.File = NodeFile;
class FakeElement {
	closest(selector) {
		return selector === '.excalidraw-wrapper' ? this : null;
	}
}
globalThis.Element = FakeElement;
globalThis.Node = FakeElement;
globalThis.document = {};
globalThis.window = { setTimeout };
globalThis.atob ??= (value) => Buffer.from(value, 'base64').toString('binary');

const buildDir = await mkdtemp(path.join(tmpdir(), 'cf-imgbed-excalidraw-test-'));
const bundlePath = path.join(buildDir, 'excalidrawIntegration.mjs');
after(() => rm(buildDir, { recursive: true, force: true }));
await build({
	entryPoints: [path.resolve('src/events/excalidrawIntegration.ts')],
	bundle: true,
	format: 'esm',
	platform: 'node',
	target: 'node18',
	outfile: bundlePath
});
const { ExcalidrawIntegration } = await import(pathToFileURL(bundlePath).href);

function createView() {
	return {
		file: { name: 'drawing.excalidraw.md', extension: 'md' },
		scene: { elements: [], files: {} },
		getViewType: () => 'excalidraw',
		getScene() {
			return this.scene;
		}
	};
}

function createAutomate(view) {
	return {
		elementsDict: {},
		imagesDict: {},
		commits: [],
		setView() {},
		clear() {
			this.elementsDict = {};
			this.imagesDict = {};
		},
		async addImage(x, y) {
			const id = `uploaded-${this.commits.length}`;
			const fileId = `remote-${this.commits.length}`;
			this.elementsDict[id] = { id, type: 'image', fileId, x, y };
			this.imagesDict[fileId] = {
				id: fileId,
				mimeType: 'image/png',
				dataURL: 'data:image/png;base64,AA=='
			};
			return id;
		},
		getElement(id) {
			return this.elementsDict[id];
		},
		copyViewElementsToEAforEditing(elements) {
			for (const element of elements) {
				this.elementsDict[element.id] = { ...element };
			}
		},
		async addElementsToView() {
			const committed = Object.values(this.elementsDict).map((element) => ({ ...element }));
			this.commits.push(committed);
			const byId = new Map(view.scene.elements.map((element) => [element.id, element]));
			for (const element of committed) {
				byId.set(element.id, element);
			}
			view.scene = {
				elements: Array.from(byId.values()),
				files: { ...view.scene.files, ...this.imagesDict }
			};
			return true;
		}
	};
}

function createPlugin(view) {
	const disposers = [];
	const domEvents = [];
	return {
		domEvents,
		app: {
			workspace: {
				onLayoutReady() {},
				getLeavesOfType: () => view ? [{ view }] : [],
				on: () => ({})
			}
		},
		register(disposer) {
			disposers.push(disposer);
		},
		registerEvent() {},
		registerDomEvent(target, type, listener, options) {
			domEvents.push({ target, type, listener, options });
		},
		cleanup() {
			for (const dispose of disposers.reverse()) {
				dispose();
			}
		}
	};
}

function createImageHandler() {
	return {
		browserUploads: [],
		vaultUploads: [],
		async uploadImageToExcalidraw(file, noteFile, insert) {
			this.browserUploads.push({ file, noteFile });
			await insert('https://img.example/uploaded.png');
		},
		async uploadVaultImageToExcalidraw(file, noteFile, insert) {
			this.vaultUploads.push({ file, noteFile });
			await insert('https://img.example/uploaded.png');
		}
	};
}

async function flushQueue() {
	await new Promise((resolve) => setTimeout(resolve, 20));
}

function setup(enabled = true) {
	const settings = { enableExcalidrawUpload: enabled };
	const view = createView();
	const automate = createAutomate(view);
	const imageHandler = createImageHandler();
	const plugin = createPlugin(view);
	globalThis.ExcalidrawAutomate = automate;
	new ExcalidrawIntegration(imageHandler, () => settings).register(plugin);
	return {
		settings,
		view,
		automate,
		imageHandler,
		plugin,
		cleanup() {
			plugin.cleanup();
			delete globalThis.ExcalidrawAutomate;
		}
	};
}

test('master switch leaves Excalidraw paste handling native when disabled', () => {
	const context = setup(false);
	try {
		const file = new File(['image'], 'paste.png', { type: 'image/png' });
		const handled = context.automate.onPasteHook({
			ea: context.automate,
			payload: {},
			event: {
				clipboardData: {
					items: [{ type: 'image/png', getAsFile: () => file }],
					files: []
				}
			},
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 10, y: 20 }
		});
		assert.equal(handled, true);
		assert.equal(context.imageHandler.browserUploads.length, 0);
	} finally {
		context.cleanup();
	}
});

test('master switch changes take effect without reloading the plugin', async () => {
	const context = setup(false);
	try {
		context.settings.enableExcalidrawUpload = true;
		const file = new File(['image'], 'paste.png', { type: 'image/png' });
		const handled = context.automate.onPasteHook({
			ea: context.automate,
			payload: {},
			event: {
				clipboardData: {
					items: [{ type: 'image/png', getAsFile: () => file }],
					files: []
				},
				preventDefault() {},
				stopPropagation() {}
			},
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 0, y: 0 }
		});
		assert.equal(handled, false);
		await flushQueue();
		assert.equal(context.imageHandler.browserUploads.length, 1);
	} finally {
		context.cleanup();
	}
});

test('image paste uploads and inserts while Excalidraw element paste stays native', async () => {
	const context = setup(true);
	try {
		const nativeResult = context.automate.onPasteHook({
			ea: context.automate,
			payload: {
				elements: [{ id: 'copied', type: 'image', fileId: 'copied-file' }],
				files: { 'copied-file': { dataURL: 'data:image/png;base64,AA==', mimeType: 'image/png' } }
			},
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 0, y: 0 }
		});
		assert.equal(nativeResult, true);

		const file = new File(['image'], 'paste.png', { type: 'image/png' });
		let prevented = false;
		const uploadResult = context.automate.onPasteHook({
			ea: context.automate,
			payload: {},
			event: {
				clipboardData: {
					items: [{ type: 'image/png', getAsFile: () => file }],
					files: []
				},
				preventDefault: () => { prevented = true; },
				stopPropagation() {}
			},
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 10, y: 20 }
		});
		assert.equal(uploadResult, false);
		await flushQueue();
		assert.equal(prevented, true);
		assert.equal(context.imageHandler.browserUploads.length, 1);
		assert.equal(context.automate.commits.length, 1);
		assert.deepEqual(
			{ x: context.automate.commits[0][0].x, y: context.automate.commits[0][0].y },
			{ x: 10, y: 20 }
		);
	} finally {
		context.cleanup();
	}
});

test('vault image drop uploads and suppresses native insertion', async () => {
	const context = setup(true);
	try {
		const vaultImage = { name: 'vault.png', extension: 'png' };
		const handled = context.automate.onDropHook({
			ea: context.automate,
			event: { preventDefault() {}, stopPropagation() {} },
			type: 'file',
			payload: { files: [vaultImage], text: '' },
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 30, y: 40 }
		});
		assert.equal(handled, true);
		await flushQueue();
		assert.equal(context.imageHandler.vaultUploads.length, 1);
		assert.equal(context.automate.commits.length, 1);
	} finally {
		context.cleanup();
	}
});

test('new image inserted by Excalidraw is uploaded and replaced with the remote file', async () => {
	const context = setup(true);
	try {
		const nativeElement = { id: 'native-image', type: 'image', fileId: 'native-file', x: 5, y: 6 };
		const nativeFile = {
			id: 'native-file',
			mimeType: 'image/png',
			dataURL: 'data:image/png;base64,AA=='
		};
		context.view.scene = {
			elements: [nativeElement],
			files: { 'native-file': nativeFile }
		};
		context.automate.onSceneChangeHook.callback(
			context.view.scene.elements,
			{},
			context.view.scene.files,
			context.view,
			context.automate
		);
		await flushQueue();
		assert.equal(context.imageHandler.browserUploads.length, 1);
		const replaced = context.view.scene.elements.find((element) => element.id === 'native-image');
		assert.match(replaced.fileId, /^remote-/);
	} finally {
		context.cleanup();
	}
});

test('external image dragover enables dropping only while takeover is enabled', () => {
	const enabledContext = setup(true);
	try {
		const target = new FakeElement();
		let prevented = false;
		const dragoverListener = enabledContext.plugin.domEvents.find((event) => event.type === 'dragover').listener;
		dragoverListener({
			target,
			dataTransfer: { types: ['Files'] },
			preventDefault: () => { prevented = true; }
		});
		assert.equal(prevented, true);
	} finally {
		enabledContext.cleanup();
	}

	const disabledContext = setup(false);
	try {
		const target = new FakeElement();
		let prevented = false;
		const dragoverListener = disabledContext.plugin.domEvents.find((event) => event.type === 'dragover').listener;
		dragoverListener({
			target,
			dataTransfer: { types: ['Files'] },
			preventDefault: () => { prevented = true; }
		});
		assert.equal(prevented, false);
	} finally {
		disabledContext.cleanup();
	}
});

test('external image drop uploads at the dropped canvas position', async () => {
	const context = setup(true);
	try {
		const target = new FakeElement();
		context.view.containerEl = { contains: (node) => node === target };
		context.view.excalidrawAPI = {
			getAppState: () => ({
				offsetLeft: 10,
				offsetTop: 20,
				scrollX: 5,
				scrollY: 6,
				zoom: { value: 2 }
			})
		};
		const file = new File(['image'], 'drop.png', { type: 'image/png' });
		let prevented = false;
		const dropListener = context.plugin.domEvents.find((event) => event.type === 'drop').listener;
		dropListener({
			target,
			dataTransfer: { files: [file] },
			clientX: 110,
			clientY: 70,
			preventDefault: () => { prevented = true; },
			stopPropagation() {}
		});
		await flushQueue();
		assert.equal(prevented, true);
		assert.equal(context.imageHandler.browserUploads.length, 1);
		assert.deepEqual(
			{ x: context.automate.commits[0][0].x, y: context.automate.commits[0][0].y },
			{ x: 45, y: 19 }
		);
	} finally {
		context.cleanup();
	}
});

test('master switch also leaves drop and native image insertion to Excalidraw', async () => {
	const context = setup(false);
	try {
		const dropHandled = context.automate.onDropHook({
			ea: context.automate,
			type: 'file',
			payload: { files: [{ name: 'vault.png', extension: 'png' }], text: '' },
			excalidrawFile: context.view.file,
			view: context.view,
			pointerPosition: { x: 0, y: 0 }
		});
		assert.equal(dropHandled, false);

		const nativeElement = { id: 'native-image', type: 'image', fileId: 'native-file' };
		const nativeFile = { mimeType: 'image/png', dataURL: 'data:image/png;base64,AA==' };
		context.automate.onSceneChangeHook.callback(
			[nativeElement],
			{},
			{ 'native-file': nativeFile },
			context.view,
			context.automate
		);
		await flushQueue();
		assert.equal(context.imageHandler.vaultUploads.length, 0);
		assert.equal(context.imageHandler.browserUploads.length, 0);
	} finally {
		context.cleanup();
	}
});
