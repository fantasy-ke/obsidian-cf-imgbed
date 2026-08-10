import type { Plugin, TFile } from 'obsidian';
import type { CFImageBedSettings } from '../types';
import type { ImageHandler } from '../upload/imageHandler';
import {
	createFileFromPayload,
	EXCALIDRAW_VIEW_TYPE,
	getClipboardImageFiles,
	getScenePosition,
	isBrowserImage,
	isExcalidrawEventTarget,
	isVaultImage,
	offsetPosition
} from './excalidrawImageUtils';
import { ExcalidrawSceneUploadTracker } from './excalidrawSceneUploadTracker';
import type {
	ExcalidrawAutomate,
	ExcalidrawDropHook,
	ExcalidrawGlobal,
	ExcalidrawPasteHook,
	ExcalidrawSceneChangeHook,
	ExcalidrawView
} from './excalidrawTypes';

export { isExcalidrawEventTarget };

export class ExcalidrawIntegration {
	private installedAutomate: ExcalidrawAutomate | null = null;
	private operationQueue: Promise<void> = Promise.resolve();
	private sceneUploadTracker: ExcalidrawSceneUploadTracker;

	constructor(
		private imageHandler: ImageHandler,
		private getSettings: () => CFImageBedSettings
	) {
		this.sceneUploadTracker = new ExcalidrawSceneUploadTracker(
			imageHandler,
			() => this.isEnabled(),
			(operation) => this.enqueue(operation)
		);
	}

	register(plugin: Plugin): void {
		const initialize = () => {
			this.installHooks(plugin);
			this.sceneUploadTracker.seedOpenViews(plugin);
		};

		initialize();
		plugin.app.workspace.onLayoutReady(initialize);
		plugin.registerEvent(plugin.app.workspace.on('active-leaf-change', (leaf) => {
			this.installHooks(plugin);
			if (!leaf) {
				return;
			}
			window.setTimeout(() => {
				this.sceneUploadTracker.seedView(leaf.view as unknown as ExcalidrawView);
			}, 0);
		}));

		plugin.registerDomEvent(document, 'dragover', (event: DragEvent) => {
			this.handleExternalFileDragOver(event);
		}, true);
		plugin.registerDomEvent(document, 'drop', (event: DragEvent) => {
			this.handleExternalFileDrop(plugin, event);
		}, true);
	}

	private installHooks(plugin: Plugin): void {
		const runtime = globalThis as ExcalidrawGlobal;
		const automate = runtime.ExcalidrawAutomate;
		if (!automate || this.installedAutomate === automate) {
			return;
		}

		const previousPasteHook = automate.onPasteHook;
		const previousDropHook = automate.onDropHook;
		const previousSceneHook = automate.onSceneChangeHook;

		const pasteHook: ExcalidrawPasteHook = (data) => {
			if (data.payload.elements?.length) {
				this.sceneUploadTracker.markPayloadFilesAsKnown(data.view, data.payload);
			}

			if (previousPasteHook) {
				try {
					if (previousPasteHook(data) === false) {
						return false;
					}
				} catch (error) {
					console.error('CF ImageBed: Existing Excalidraw paste hook failed', error);
				}
			}

			if (!this.isEnabled() || data.payload.elements?.length) {
				return true;
			}

			const imageFiles = getClipboardImageFiles(data.event);
			if (imageFiles.length === 0) {
				const payloadFile = createFileFromPayload(data.payload);
				if (payloadFile) {
					imageFiles.push(payloadFile);
				}
			}
			if (imageFiles.length === 0) {
				return true;
			}

			data.event?.preventDefault();
			data.event?.stopPropagation();
			this.enqueue(() => this.handleBrowserFiles(
				imageFiles,
				data.excalidrawFile,
				data.view,
				data.ea,
				data.pointerPosition
			));
			return false;
		};

		const dropHook: ExcalidrawDropHook = (data) => {
			if (previousDropHook) {
				try {
					if (previousDropHook(data) === true) {
						return true;
					}
				} catch (error) {
					console.error('CF ImageBed: Existing Excalidraw drop hook failed', error);
				}
			}

			if (!this.isEnabled() || data.type !== 'file') {
				return false;
			}

			const imageFiles = data.payload.files.filter(isVaultImage);
			if (imageFiles.length === 0) {
				return false;
			}

			data.event?.preventDefault();
			data.event?.stopPropagation();
			this.enqueue(() => this.handleVaultFiles(
				imageFiles,
				data.excalidrawFile,
				data.view,
				data.ea,
				data.pointerPosition
			));
			return true;
		};

		const sceneHook: ExcalidrawSceneChangeHook = {
			appStateKeys: previousSceneHook?.appStateKeys,
			trackElements: true,
			triggerWhenInvisible: previousSceneHook?.triggerWhenInvisible,
			callback: (elements, appState, files, view, ea) => {
				if (previousSceneHook) {
					try {
						previousSceneHook.callback(elements, appState, files, view, ea);
					} catch (error) {
						console.error('CF ImageBed: Existing Excalidraw scene hook failed', error);
					}
				}
				this.sceneUploadTracker.handleSceneChange(elements, files, view, ea);
			}
		};

		automate.onPasteHook = pasteHook;
		automate.onDropHook = dropHook;
		automate.onSceneChangeHook = sceneHook;
		this.installedAutomate = automate;

		plugin.register(() => {
			if (automate.onPasteHook === pasteHook) {
				automate.onPasteHook = previousPasteHook;
			}
			if (automate.onDropHook === dropHook) {
				automate.onDropHook = previousDropHook;
			}
			if (automate.onSceneChangeHook === sceneHook) {
				automate.onSceneChangeHook = previousSceneHook;
			}
			if (this.installedAutomate === automate) {
				this.installedAutomate = null;
			}
		});
	}

	private handleExternalFileDragOver(event: DragEvent): void {
		if (!this.isEnabled() || !isExcalidrawEventTarget(event.target)) {
			return;
		}

		if (Array.from(event.dataTransfer?.types ?? []).includes('Files')) {
			event.preventDefault();
		}
	}

	private handleExternalFileDrop(plugin: Plugin, event: DragEvent): void {
		if (!this.isEnabled() || !isExcalidrawEventTarget(event.target)) {
			return;
		}

		const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(isBrowserImage);
		if (imageFiles.length === 0) {
			return;
		}

		const view = this.findViewForTarget(plugin, event.target);
		const automate = this.installedAutomate;
		if (!view?.file || !automate) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		this.enqueue(() => this.handleBrowserFiles(
			imageFiles,
			view.file as TFile,
			view,
			automate,
			getScenePosition(view, event)
		));
	}

	private async handleBrowserFiles(
		files: File[],
		noteFile: TFile,
		view: ExcalidrawView,
		ea: ExcalidrawAutomate,
		position: { x: number; y: number }
	): Promise<void> {
		for (let index = 0; index < files.length; index++) {
			await this.imageHandler.uploadImageToExcalidraw(
				files[index],
				noteFile,
				(imageUrl) => this.insertUploadedImage(imageUrl, offsetPosition(position, index), view, ea)
			);
		}
	}

	private async handleVaultFiles(
		files: TFile[],
		noteFile: TFile,
		view: ExcalidrawView,
		ea: ExcalidrawAutomate,
		position: { x: number; y: number }
	): Promise<void> {
		for (let index = 0; index < files.length; index++) {
			await this.imageHandler.uploadVaultImageToExcalidraw(
				files[index],
				noteFile,
				(imageUrl) => this.insertUploadedImage(imageUrl, offsetPosition(position, index), view, ea)
			);
		}
	}

	private async insertUploadedImage(
		imageUrl: string,
		position: { x: number; y: number },
		view: ExcalidrawView,
		ea: ExcalidrawAutomate
	): Promise<void> {
		ea.setView(view);
		ea.clear();
		try {
			const elementId = await ea.addImage(position.x, position.y, imageUrl);
			if (!elementId) {
				throw new Error('Failed to create the uploaded Excalidraw image');
			}

			const imageElement = ea.getElement(elementId);
			if (imageElement?.fileId) {
				this.sceneUploadTracker.markImageAsKnown(view, imageElement.fileId);
			}

			const inserted = await ea.addElementsToView(false, true, true);
			if (!inserted) {
				throw new Error('Failed to insert the uploaded image into Excalidraw');
			}
		} finally {
			ea.clear();
		}
	}

	private findViewForTarget(plugin: Plugin, target: EventTarget | null): ExcalidrawView | null {
		if (!(target instanceof Node)) {
			return null;
		}

		for (const leaf of plugin.app.workspace.getLeavesOfType(EXCALIDRAW_VIEW_TYPE)) {
			const view = leaf.view as unknown as ExcalidrawView;
			if (view.containerEl?.contains(target)) {
				return view;
			}
		}
		return null;
	}

	private isEnabled(): boolean {
		return this.getSettings().enableExcalidrawUpload;
	}

	private enqueue(operation: () => Promise<void>): void {
		this.operationQueue = this.operationQueue
			.then(operation)
			.catch((error) => {
				console.error('CF ImageBed: Excalidraw image upload failed', error);
			});
	}
}
