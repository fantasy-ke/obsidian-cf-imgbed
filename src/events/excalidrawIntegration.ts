import { Plugin, TFile } from 'obsidian';
import { ImageHandler } from '../upload/imageHandler';

interface ExcalidrawBinaryFile {
	mimeType?: string;
	dataURL?: string;
}

interface ExcalidrawPastePayload {
	elements?: readonly unknown[];
	files?: Record<string, ExcalidrawBinaryFile>;
}

interface ExcalidrawPasteData {
	ea: {
		addImage: (topX: number, topY: number, imageFile: string) => Promise<unknown>;
		addElementsToView: (
			repositionToCursor?: boolean,
			save?: boolean,
			newElementsOnTop?: boolean
		) => Promise<boolean>;
	};
	payload: ExcalidrawPastePayload;
	event?: ClipboardEvent | null;
	excalidrawFile: TFile;
	pointerPosition: { x: number; y: number };
}

type ExcalidrawPasteHook = (data: ExcalidrawPasteData) => boolean;

interface ExcalidrawAutomate {
	onPasteHook?: ExcalidrawPasteHook | null;
}

type ExcalidrawGlobal = typeof globalThis & {
	ExcalidrawAutomate?: ExcalidrawAutomate;
};

export class ExcalidrawIntegration {
	private installedAutomate: ExcalidrawAutomate | null = null;
	private installedHook: ExcalidrawPasteHook | null = null;

	constructor(private imageHandler: ImageHandler) {}

	register(plugin: Plugin): void {
		const installHook = () => this.installPasteHook(plugin);
		installHook();
		plugin.app.workspace.onLayoutReady(installHook);
	}

	private installPasteHook(plugin: Plugin): void {
		const runtime = globalThis as ExcalidrawGlobal;
		const automate = runtime.ExcalidrawAutomate;
		if (!automate || this.installedAutomate === automate) {
			return;
		}

		const previousHook = automate.onPasteHook;
		const hook: ExcalidrawPasteHook = (data) => {
			if (previousHook) {
				try {
					if (previousHook(data) === false) {
						return false;
					}
				} catch (error) {
					console.error('CF ImageBed: Existing Excalidraw paste hook failed', error);
				}
			}

			if (!this.hasExternalImagePaste(data)) {
				return true;
			}

			data.event?.preventDefault();
			data.event?.stopPropagation();
			void this.handleImagePaste(data);
			return false;
		};

		automate.onPasteHook = hook;
		this.installedAutomate = automate;
		this.installedHook = hook;

		plugin.register(() => {
			if (automate.onPasteHook === hook) {
				automate.onPasteHook = previousHook;
			}
			if (this.installedAutomate === automate && this.installedHook === hook) {
				this.installedAutomate = null;
				this.installedHook = null;
			}
		});
	}

	private hasExternalImagePaste(data: ExcalidrawPasteData): boolean {
		// Excalidraw clipboard data already contains elements and must keep its native behavior.
		if (data.payload.elements && data.payload.elements.length > 0) {
			return false;
		}

		return Boolean(this.getClipboardImageFile(data.event) || this.getPayloadImage(data.payload));
	}

	private async handleImagePaste(data: ExcalidrawPasteData): Promise<void> {
		try {
			const file = this.getClipboardImageFile(data.event) ?? this.createFileFromPayload(data.payload);
			if (!file) {
				return;
			}

			await this.imageHandler.uploadImageToExcalidraw(
				file,
				data.excalidrawFile,
				async (imageUrl) => {
					await data.ea.addImage(data.pointerPosition.x, data.pointerPosition.y, imageUrl);
					await data.ea.addElementsToView(false, true, true);
				}
			);
		} catch (error) {
			console.error('CF ImageBed: Excalidraw image upload failed', error);
		}
	}

	private getClipboardImageFile(event?: ClipboardEvent | null): File | null {
		const clipboardData = event?.clipboardData;
		if (!clipboardData) {
			return null;
		}

		for (const item of Array.from(clipboardData.items)) {
			if (!item.type.startsWith('image/')) {
				continue;
			}

			const file = item.getAsFile();
			if (file) {
				return file;
			}
		}

		for (const file of Array.from(clipboardData.files)) {
			if (file.type.startsWith('image/')) {
				return file;
			}
		}

		return null;
	}

	private getPayloadImage(payload: ExcalidrawPastePayload): ExcalidrawBinaryFile | null {
		if (!payload.files) {
			return null;
		}

		for (const key of Object.keys(payload.files)) {
			const file = payload.files[key];
			if (file?.dataURL && (file.mimeType?.startsWith('image/') || file.dataURL.startsWith('data:image/'))) {
				return file;
			}
		}

		return null;
	}

	private createFileFromPayload(payload: ExcalidrawPastePayload): File | null {
		const image = this.getPayloadImage(payload);
		if (!image?.dataURL) {
			return null;
		}

		const separator = image.dataURL.indexOf(',');
		if (separator < 0) {
			return null;
		}

		const header = image.dataURL.slice(0, separator);
		const content = image.dataURL.slice(separator + 1);
		const mimeType = image.mimeType || header.match(/^data:([^;]+)/)?.[1] || 'image/png';
		const bytes = header.includes(';base64')
			? this.decodeBase64(content)
			: this.decodeText(content);
		if (!bytes) {
			return null;
		}

		return new File([bytes], `Pasted image.${this.getExtension(mimeType)}`, { type: mimeType });
	}

	private decodeBase64(value: string): Uint8Array | null {
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

	private decodeText(value: string): Uint8Array | null {
		try {
			return new TextEncoder().encode(decodeURIComponent(value));
		} catch (_) {
			return null;
		}
	}

	private getExtension(mimeType: string): string {
		const subtype = mimeType.split('/')[1]?.split('+')[0]?.toLowerCase();
		return subtype === 'jpeg' ? 'jpg' : subtype || 'png';
	}
}
