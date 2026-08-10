import type { TFile } from 'obsidian';

export interface ExcalidrawBinaryFile {
	id?: string;
	mimeType?: string;
	dataURL?: string;
	created?: number;
	[key: string]: unknown;
}

export interface ExcalidrawImageElement {
	id: string;
	type: string;
	fileId?: string;
	isDeleted?: boolean;
	x?: number;
	y?: number;
	[key: string]: unknown;
}

export interface ExcalidrawScene {
	elements: readonly ExcalidrawImageElement[];
	files: Record<string, ExcalidrawBinaryFile>;
}

export interface ExcalidrawAppState {
	offsetLeft: number;
	offsetTop: number;
	scrollX: number;
	scrollY: number;
	zoom: { value: number };
}

export interface ExcalidrawView {
	file?: TFile | null;
	containerEl?: HTMLElement;
	currentPosition?: { x: number; y: number };
	excalidrawAPI?: {
		getAppState: () => ExcalidrawAppState;
	};
	getScene?: () => ExcalidrawScene | null;
	getViewType?: () => string;
}

export interface ExcalidrawAutomate {
	elementsDict: Record<string, ExcalidrawImageElement>;
	imagesDict: Record<string, ExcalidrawBinaryFile>;
	setView: (view: ExcalidrawView) => void;
	clear: () => void;
	addImage: (topX: number, topY: number, imageFile: string) => Promise<string | null>;
	getElement: (id: string) => ExcalidrawImageElement | undefined;
	copyViewElementsToEAforEditing: (elements: ExcalidrawImageElement[], copyImages?: boolean) => void;
	addElementsToView: (
		repositionToCursor?: boolean,
		save?: boolean,
		newElementsOnTop?: boolean
	) => Promise<boolean>;
	onPasteHook?: ExcalidrawPasteHook | null;
	onDropHook?: ExcalidrawDropHook | null;
	onSceneChangeHook?: ExcalidrawSceneChangeHook | null;
}

export interface ExcalidrawPastePayload {
	elements?: readonly ExcalidrawImageElement[];
	files?: Record<string, ExcalidrawBinaryFile>;
}

export interface ExcalidrawPasteData {
	ea: ExcalidrawAutomate;
	payload: ExcalidrawPastePayload;
	event?: ClipboardEvent | null;
	excalidrawFile: TFile;
	view: ExcalidrawView;
	pointerPosition: { x: number; y: number };
}

export interface ExcalidrawDropData {
	ea: ExcalidrawAutomate;
	event?: DragEvent | null;
	type: 'file' | 'text' | 'unknown';
	payload: {
		files: TFile[];
		text: string;
	};
	excalidrawFile: TFile;
	view: ExcalidrawView;
	pointerPosition: { x: number; y: number };
}

export type ExcalidrawPasteHook = (data: ExcalidrawPasteData) => boolean;
export type ExcalidrawDropHook = (data: ExcalidrawDropData) => boolean;
export type ExcalidrawSceneChangeHook = {
	appStateKeys?: string[];
	trackElements?: boolean;
	triggerWhenInvisible?: boolean;
	callback: (
		elements: readonly ExcalidrawImageElement[],
		appState: ExcalidrawAppState,
		files: Record<string, ExcalidrawBinaryFile>,
		view: ExcalidrawView,
		ea: ExcalidrawAutomate
	) => void;
};

export type ExcalidrawGlobal = typeof globalThis & {
	ExcalidrawAutomate?: ExcalidrawAutomate;
};
