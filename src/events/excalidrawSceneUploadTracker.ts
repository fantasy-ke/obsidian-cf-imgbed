import type { Plugin } from 'obsidian';
import type { ImageHandler } from '../upload/imageHandler';
import {
	createFileFromDataUrl,
	EXCALIDRAW_VIEW_TYPE,
	isImageBinaryFile,
	isImageElement
} from './excalidrawImageUtils';
import type {
	ExcalidrawAutomate,
	ExcalidrawBinaryFile,
	ExcalidrawImageElement,
	ExcalidrawPastePayload,
	ExcalidrawView
} from './excalidrawTypes';

interface ViewImageState {
	knownFileIds: Set<string>;
}

export class ExcalidrawSceneUploadTracker {
	private viewImageStates = new WeakMap<ExcalidrawView, ViewImageState>();

	constructor(
		private imageHandler: ImageHandler,
		private isEnabled: () => boolean,
		private enqueue: (operation: () => Promise<void>) => void
	) {}

	handleSceneChange(
		elements: readonly ExcalidrawImageElement[],
		files: Record<string, ExcalidrawBinaryFile>,
		view: ExcalidrawView,
		ea: ExcalidrawAutomate
	): void {
		const existingState = this.viewImageStates.get(view);
		if (!existingState || !this.isEnabled()) {
			this.syncViewState(view, elements);
			return;
		}

		const pendingFileIds = new Set<string>();
		for (const element of elements) {
			if (!isImageElement(element) || existingState.knownFileIds.has(element.fileId)) {
				continue;
			}

			const binaryFile = files[element.fileId];
			if (!isImageBinaryFile(binaryFile)) {
				continue;
			}

			existingState.knownFileIds.add(element.fileId);
			pendingFileIds.add(element.fileId);
		}

		for (const fileId of pendingFileIds) {
			this.enqueue(() => this.uploadAndReplaceSceneImages(fileId, files[fileId], view, ea));
		}
	}

	seedOpenViews(plugin: Plugin): void {
		for (const leaf of plugin.app.workspace.getLeavesOfType(EXCALIDRAW_VIEW_TYPE)) {
			this.seedView(leaf.view as unknown as ExcalidrawView);
		}
	}

	seedView(view: ExcalidrawView): void {
		if (view.getViewType?.() !== EXCALIDRAW_VIEW_TYPE) {
			return;
		}

		const scene = view.getScene?.();
		if (scene) {
			this.syncViewState(view, scene.elements);
		}
	}

	markImageAsKnown(view: ExcalidrawView, fileId: string): void {
		this.ensureViewState(view).knownFileIds.add(fileId);
	}

	markPayloadFilesAsKnown(view: ExcalidrawView, payload: ExcalidrawPastePayload): void {
		const state = this.ensureViewState(view);
		for (const fileId of Object.keys(payload.files ?? {})) {
			state.knownFileIds.add(fileId);
		}
		for (const element of payload.elements ?? []) {
			if (isImageElement(element)) {
				state.knownFileIds.add(element.fileId);
			}
		}
	}

	private async uploadAndReplaceSceneImages(
		sourceFileId: string,
		binaryFile: ExcalidrawBinaryFile,
		view: ExcalidrawView,
		ea: ExcalidrawAutomate
	): Promise<void> {
		const file = createFileFromDataUrl(binaryFile.dataURL, binaryFile.mimeType, 'Excalidraw image');
		if (!file) {
			return;
		}

		await this.imageHandler.uploadImageToExcalidraw(file, view.file ?? null, async (imageUrl) => {
			if (!this.isEnabled()) {
				return;
			}

			const sceneElements = view.getScene?.()?.elements ?? [];
			const currentElements = sceneElements.filter((element) =>
				isImageElement(element) && element.fileId === sourceFileId
			);
			if (currentElements.length === 0) {
				return;
			}

			ea.setView(view);
			ea.clear();
			try {
				const firstElement = currentElements[0];
				const temporaryId = await ea.addImage(firstElement.x ?? 0, firstElement.y ?? 0, imageUrl);
				if (!temporaryId) {
					throw new Error('Failed to load the uploaded Excalidraw image');
				}

				const temporaryElement = ea.getElement(temporaryId);
				const uploadedFileId = temporaryElement?.fileId;
				if (!uploadedFileId) {
					throw new Error('Uploaded Excalidraw image has no file ID');
				}

				delete ea.elementsDict[temporaryId];
				ea.copyViewElementsToEAforEditing(currentElements as ExcalidrawImageElement[]);
				for (const element of currentElements) {
					const editableElement = ea.getElement(element.id);
					if (editableElement) {
						editableElement.fileId = uploadedFileId;
						this.markImageAsKnown(view, uploadedFileId);
					}
				}

				const inserted = await ea.addElementsToView(false, true, false);
				if (!inserted) {
					throw new Error('Failed to replace the Excalidraw image with its uploaded URL');
				}
			} finally {
				ea.clear();
			}
		});
	}

	private syncViewState(view: ExcalidrawView, elements: readonly ExcalidrawImageElement[]): void {
		const state: ViewImageState = { knownFileIds: new Set<string>() };
		for (const element of elements) {
			if (isImageElement(element)) {
				state.knownFileIds.add(element.fileId);
			}
		}
		this.viewImageStates.set(view, state);
	}

	private ensureViewState(view: ExcalidrawView): ViewImageState {
		const currentState = this.viewImageStates.get(view);
		if (currentState) {
			return currentState;
		}

		this.syncViewState(view, view.getScene?.()?.elements ?? []);
		return this.viewImageStates.get(view) as ViewImageState;
	}
}
