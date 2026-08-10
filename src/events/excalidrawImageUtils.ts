import type { TFile } from 'obsidian';
import type {
	ExcalidrawBinaryFile,
	ExcalidrawImageElement,
	ExcalidrawPastePayload,
	ExcalidrawView
} from './excalidrawTypes';

export const EXCALIDRAW_VIEW_TYPE = 'excalidraw';
const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const IMAGE_POSITION_OFFSET = 40;

export function isExcalidrawEventTarget(target: EventTarget | null): boolean {
	return target instanceof Element && Boolean(target.closest('.excalidraw-wrapper'));
}

export function getClipboardImageFiles(event?: ClipboardEvent | null): File[] {
	const clipboardData = event?.clipboardData;
	if (!clipboardData) {
		return [];
	}

	const files: File[] = [];
	for (const item of Array.from(clipboardData.items)) {
		if (!item.type.startsWith('image/')) {
			continue;
		}
		const file = item.getAsFile();
		if (file) {
			files.push(file);
		}
	}
	if (files.length > 0) {
		return files;
	}

	return Array.from(clipboardData.files).filter(isBrowserImage);
}

export function createFileFromPayload(payload: ExcalidrawPastePayload): File | null {
	for (const binaryFile of Object.values(payload.files ?? {})) {
		if (isImageBinaryFile(binaryFile)) {
			return createFileFromDataUrl(binaryFile.dataURL, binaryFile.mimeType, 'Pasted image');
		}
	}
	return null;
}

export function createFileFromDataUrl(
	dataUrl: string | undefined,
	declaredMimeType: string | undefined,
	baseName: string
): File | null {
	if (!dataUrl) {
		return null;
	}

	const separator = dataUrl.indexOf(',');
	if (separator < 0) {
		return null;
	}

	const header = dataUrl.slice(0, separator);
	const content = dataUrl.slice(separator + 1);
	const mimeType = declaredMimeType || header.match(/^data:([^;]+)/)?.[1] || 'image/png';
	const bytes = header.includes(';base64') ? decodeBase64(content) : decodeText(content);
	if (!bytes) {
		return null;
	}

	return new File([bytes], `${baseName}.${getExtension(mimeType)}`, { type: mimeType });
}

export function isBrowserImage(file: File): boolean {
	if (file.type.startsWith('image/')) {
		return true;
	}
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	return IMAGE_EXTENSIONS.has(extension);
}

export function isVaultImage(file: TFile): boolean {
	return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

export function isImageElement(
	element: ExcalidrawImageElement
): element is ExcalidrawImageElement & { fileId: string } {
	return element.type === 'image' && !element.isDeleted && Boolean(element.fileId);
}

export function isImageBinaryFile(
	file: ExcalidrawBinaryFile | undefined
): file is ExcalidrawBinaryFile & { dataURL: string } {
	return Boolean(
		file?.dataURL &&
		(file.mimeType?.startsWith('image/') || file.dataURL.startsWith('data:image/'))
	);
}

export function offsetPosition(position: { x: number; y: number }, index: number): { x: number; y: number } {
	return {
		x: position.x + index * IMAGE_POSITION_OFFSET,
		y: position.y + index * IMAGE_POSITION_OFFSET
	};
}

export function getScenePosition(view: ExcalidrawView, event: DragEvent): { x: number; y: number } {
	const appState = view.excalidrawAPI?.getAppState();
	const zoom = appState?.zoom?.value;
	if (appState && zoom) {
		return {
			x: (event.clientX - appState.offsetLeft) / zoom - appState.scrollX,
			y: (event.clientY - appState.offsetTop) / zoom - appState.scrollY
		};
	}
	return view.currentPosition ?? { x: 0, y: 0 };
}

function decodeBase64(value: string): Uint8Array | null {
	try {
		const binary = atob(value);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index++) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	} catch (_) {
		return null;
	}
}

function decodeText(value: string): Uint8Array | null {
	try {
		return new TextEncoder().encode(decodeURIComponent(value));
	} catch (_) {
		return null;
	}
}

function getExtension(mimeType: string): string {
	const subtype = mimeType.split('/')[1]?.split('+')[0]?.toLowerCase();
	return subtype === 'jpeg' ? 'jpg' : subtype || 'png';
}
