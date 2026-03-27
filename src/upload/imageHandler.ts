import { App, Editor, MarkdownView, Notice, Platform, TFile, requestUrl } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { UploadService } from './uploadService';
import { I18n } from '../utils/i18n';
import {
	ClipboardHtmlImage,
	ParsedImageReference,
	extractClipboardHtmlImages,
	extractMarkdownAndWikiImageReferences,
	extractPlainImageUrlReferences
} from '../utils/imageReferences';
import { getEffectiveExcludedDomains, isUrlExcluded } from '../utils/domainUtils';

interface TextReplacement {
	index: number;
	length: number;
	replacement: string;
}

export class ImageHandler {
    constructor(
        private app: App,
        private uploadService: UploadService,
        private getSettings?: () => CFImageBedSettings,
        private i18n?: I18n
    ) {}

	async uploadImageFromFile(file: File, deleteLocal: boolean = false): Promise<void> {
		void deleteLocal;
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		await this.uploadImageToEditor(file, activeView?.editor);
	}

	async uploadImageAtCursor(file: File): Promise<void> {
		await this.uploadImageToEditor(file);
	}

	async handleEditorPaste(evt: ClipboardEvent, editor: Editor): Promise<void> {
		const clipboardData = evt.clipboardData;
		if (!clipboardData) {
			return;
		}

		const imageFile = this.getClipboardImageFile(clipboardData);
		if (imageFile) {
			evt.preventDefault();
			evt.stopPropagation();
			await this.uploadImageToEditor(imageFile, editor);
			return;
		}

		const settings = this.getSettings?.();
		if (!settings?.enableNetworkImageUpload) {
			return;
		}

		const text = clipboardData.getData('text/plain') || clipboardData.getData('text') || '';
		const excludedDomains = this.getExcludedDomains(settings);
		const markdownRefs = extractMarkdownAndWikiImageReferences(text)
			.filter((ref) => ref.isRemote)
			.filter((ref) => !this.isExcludedRemoteUrl(ref.path, excludedDomains));
		const urlRefs = markdownRefs.length === 0
			? extractPlainImageUrlReferences(text).filter((ref) => !this.isExcludedRemoteUrl(ref.path, excludedDomains))
			: [];
		const htmlImages = extractClipboardHtmlImages(clipboardData)
			.filter((image) => !this.isExcludedRemoteUrl(image.url, excludedDomains));

		if (markdownRefs.length === 0 && urlRefs.length === 0 && htmlImages.length === 0) {
			return;
		}

		evt.preventDefault();
		evt.stopPropagation();

		if (settings.showUploadProgress) {
			new Notice('正在上传网络图片...');
		}

		const handled = await this.handleRemoteClipboardContent(
			editor,
			text,
			markdownRefs,
			urlRefs,
			htmlImages
		);

		if (!handled && text) {
			editor.replaceSelection(text);
		}
	}

	async uploadCurrentNoteImages(): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeView || !activeFile) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

		const editor = activeView.editor;
		const originalContent = editor.getValue();
		const allReferences = extractMarkdownAndWikiImageReferences(originalContent);
		const settings = this.getSettings?.();
		const excludedDomains = this.getExcludedDomains(settings);
		const uploadableReferences = allReferences.filter((reference) => {
			if (!reference.isRemote) {
				return true;
			}

			return Boolean(settings?.enableNetworkImageUpload) && !this.isExcludedRemoteUrl(reference.path, excludedDomains);
		});
		const excludedRemoteCount = allReferences.filter(
			(reference) => reference.isRemote && this.isExcludedRemoteUrl(reference.path, excludedDomains)
		).length;

		if (uploadableReferences.length === 0) {
			if (excludedRemoteCount > 0) {
				new Notice('当前文档中的网络图片都在排除域名列表中，已跳过');
				return;
			}

			if (allReferences.some((reference) => reference.isRemote)) {
				new Notice('当前文档只有网络图片。开启“网络图片上传”后可一并上传。');
				return;
			}

			new Notice('当前文档没有可上传的图片');
			return;
		}

		if (settings?.showUploadProgress) {
			new Notice(`正在上传当前文档中的 ${uploadableReferences.length} 张图片...`);
		}

		const replacements: TextReplacement[] = [];
		let successCount = 0;
		let failedCount = 0;
		const skippedCount = allReferences.length - uploadableReferences.length;

		for (const reference of uploadableReferences) {
			const uploadedUrl = reference.isRemote
				? await this.uploadRemoteImage(reference.path, reference.altText)
				: await this.uploadLocalImageReference(reference, activeFile.path);

			if (!uploadedUrl) {
				failedCount++;
				continue;
			}

			replacements.push({
				index: reference.index,
				length: reference.length,
				replacement: this.buildMarkdownImage(reference.altText, uploadedUrl, this.getFallbackImageName(reference.path))
			});
			successCount++;
		}

		if (editor.getValue() !== originalContent) {
			new Notice('文档内容已变化，本次未自动替换链接');
			return;
		}

		if (successCount > 0) {
			this.setEditorValue(editor, this.applyReplacements(originalContent, replacements));
		}

		this.showBatchUploadSummary(successCount, failedCount, skippedCount);
	}

	selectAndUploadImage(): void {
		// 检查是否在移动端环境
		const isMobile = Platform.isMobile;
		
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.multiple = false; // 移动端建议单张上传
		
		// 移动端优化：添加capture属性支持相机拍照
		if (isMobile) {
			input.setAttribute('capture', 'environment'); // 后置摄像头
		}
		
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				// 按钮上传时不删除本地文件
				void this.uploadImageFromFile(file, false);
			}
		};
		
		// 移动端优化：确保文件选择器能正常打开
		try {
			input.click();
		} catch (error) {
			console.warn('文件选择器打开失败，可能是移动端权限问题:', error);
			new Notice('请检查浏览器权限设置，允许访问文件系统');
		}
	}

	// 移动端专用：支持相机拍照和相册选择
	selectImageForMobile(): void {
		const isMobile = Platform.isMobile;
		
		if (!isMobile) {
			// 桌面端直接使用原有方法
			this.selectAndUploadImage();
			return;
		}

		// 创建选择对话框
		const modal = document.createElement('div');
		modal.className = 'cf-imagebed-modal';

		const dialog = document.createElement('div');
		dialog.className = 'cf-imagebed-dialog';

		const title = document.createElement('h3');
		title.textContent = this.i18n?.t('mobile.selectSource') || 'Select image source';
		title.className = 'cf-imagebed-dialog-title';

		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'cf-imagebed-button-container';

		const cameraBtn = document.createElement('button');
		cameraBtn.textContent = this.i18n?.t('mobile.takePhoto') || '📷 Take photo';
		cameraBtn.className = 'cf-imagebed-camera-btn';

		const galleryBtn = document.createElement('button');
		galleryBtn.textContent = this.i18n?.t('mobile.selectFromGallery') || '🖼️ Select from gallery';
		galleryBtn.className = 'cf-imagebed-gallery-btn';

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = this.i18n?.t('mobile.cancel') || 'Cancel';
		cancelBtn.className = 'cf-imagebed-cancel-btn';

		// 相机拍照
		cameraBtn.onclick = () => {
			document.body.removeChild(modal);
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.capture = 'environment';
			input.onchange = (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (file) {
					void this.uploadImageFromFile(file, false);
				}
			};
			input.click();
		};

		// 相册选择
		galleryBtn.onclick = () => {
			document.body.removeChild(modal);
			// 创建专门用于相册选择的input，不设置capture属性
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = false;
			// 不设置capture属性，这样会打开相册而不是相机
			input.onchange = (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (file) {
					void this.uploadImageFromFile(file, false);
				}
			};
			input.click();
		};

		// 取消
		cancelBtn.onclick = () => {
			document.body.removeChild(modal);
		};

		// 点击背景关闭
		modal.onclick = (e) => {
			if (e.target === modal) {
				document.body.removeChild(modal);
			}
		};

		buttonContainer.appendChild(cameraBtn);
		buttonContainer.appendChild(galleryBtn);
		buttonContainer.appendChild(cancelBtn);
		
		dialog.appendChild(title);
		dialog.appendChild(buttonContainer);
		modal.appendChild(dialog);
		document.body.appendChild(modal);
	}

	private async uploadImageToEditor(file: File, editor?: Editor): Promise<void> {
		const targetEditor = editor ?? this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!targetEditor) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

		const settings = this.getSettings?.();
		if (settings?.showUploadProgress) {
			new Notice('正在上传图片...');
		}

		const imageUrl = await this.uploadService.uploadImage(file);
		if (!imageUrl) {
			return;
		}

		targetEditor.replaceSelection(this.buildMarkdownImage(file.name, imageUrl, file.name));
		if (settings?.showSuccessNotification) {
			new Notice(`图片上传成功：${imageUrl}`, (settings.notificationDuration ?? 5) * 1000);
		}
	}

	private getClipboardImageFile(clipboardData: DataTransfer): File | null {
		for (const item of Array.from(clipboardData.items)) {
			if (!item.type.startsWith('image/')) {
				continue;
			}

			const file = item.getAsFile();
			if (file) {
				return file;
			}
		}

		return null;
	}

	private async handleRemoteClipboardContent(
		editor: Editor,
		text: string,
		markdownRefs: ParsedImageReference[],
		urlRefs: ParsedImageReference[],
		htmlImages: ClipboardHtmlImage[]
	): Promise<boolean> {
		if (markdownRefs.length > 0) {
			const { updatedText, successCount, failedCount } = await this.replaceRemoteReferencesInText(
				text,
				markdownRefs
			);
			editor.replaceSelection(updatedText);
			this.showRemotePasteSummary(successCount, failedCount);
			return true;
		}

		if (urlRefs.length > 0) {
			const { updatedText, successCount, failedCount } = await this.replaceRemoteReferencesInText(
				text,
				urlRefs
			);
			editor.replaceSelection(updatedText);
			this.showRemotePasteSummary(successCount, failedCount);
			return true;
		}

		if (htmlImages.length > 0) {
			const insertedLines: string[] = [];
			let successCount = 0;
			let failedCount = 0;

			for (const image of htmlImages) {
				const uploadedUrl = await this.uploadRemoteImage(image.url, image.altText);
				if (uploadedUrl) {
					insertedLines.push(this.buildMarkdownImage(image.altText, uploadedUrl, this.getFallbackImageName(image.url)));
					successCount++;
				} else {
					insertedLines.push(image.url);
					failedCount++;
				}
			}

			editor.replaceSelection(insertedLines.join('\n'));
			this.showRemotePasteSummary(successCount, failedCount);
			return true;
		}

		return false;
	}

	private async replaceRemoteReferencesInText(
		text: string,
		references: ParsedImageReference[]
	): Promise<{ updatedText: string; successCount: number; failedCount: number }> {
		const replacements: TextReplacement[] = [];
		let successCount = 0;
		let failedCount = 0;

		for (const reference of references) {
			const uploadedUrl = await this.uploadRemoteImage(reference.path, reference.altText);
			if (!uploadedUrl) {
				failedCount++;
				continue;
			}

			replacements.push({
				index: reference.index,
				length: reference.length,
				replacement: this.buildMarkdownImage(reference.altText, uploadedUrl, this.getFallbackImageName(reference.path))
			});
			successCount++;
		}

		return {
			updatedText: successCount > 0 ? this.applyReplacements(text, replacements) : text,
			successCount,
			failedCount
		};
	}

	private async uploadRemoteImage(url: string, altText: string): Promise<string | null> {
		try {
			const file = await this.fetchRemoteImageFile(url, altText);
			return await this.uploadService.uploadImage(file, { showErrorNotice: false });
		} catch (error) {
			console.error('Remote image upload failed:', error);
			return null;
		}
	}

	private async uploadLocalImageReference(
		reference: ParsedImageReference,
		sourcePath: string
	): Promise<string | null> {
		const localFile = this.resolveLocalFile(reference.path, sourcePath);
		if (!localFile) {
			return null;
		}

		const uploadFile = await this.createFileFromTFile(localFile);
		return this.uploadService.uploadImage(uploadFile, { showErrorNotice: false });
	}

	private resolveLocalFile(linkPath: string, sourcePath: string): TFile | null {
		const normalizedPath = decodeURIComponent(linkPath.trim())
			.replace(/^<|>$/g, '')
			.replace(/^\/+/, '');
		const resolvedByLink = this.app.metadataCache.getFirstLinkpathDest(normalizedPath, sourcePath);
		if (resolvedByLink instanceof TFile) {
			return resolvedByLink;
		}

		const resolvedByPath = this.app.vault.getAbstractFileByPath(normalizedPath);
		return resolvedByPath instanceof TFile ? resolvedByPath : null;
	}

	private async createFileFromTFile(file: TFile): Promise<File> {
		const buffer = await this.app.vault.readBinary(file);
		return new File([buffer], file.name, {
			type: this.getMimeTypeFromExtension(file.extension)
		});
	}

	private async fetchRemoteImageFile(url: string, altText: string): Promise<File> {
		const response = await requestUrl({ url });
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`下载失败：${response.status}`);
		}

		const contentTypeHeader =
			response.headers['content-type'] ||
			response.headers['Content-Type'] ||
			'';
		const contentType = contentTypeHeader.split(';')[0].trim().toLowerCase();
		const urlExtension = this.getExtensionFromUrl(url);
		const mimeExtension = this.getExtensionFromMimeType(contentType);
		const extension = mimeExtension || urlExtension || 'png';
		const mimeType = contentType.startsWith('image/')
			? contentType
			: this.getMimeTypeFromExtension(extension);

		if (!mimeType.startsWith('image/')) {
			throw new Error('远程链接不是图片');
		}

		const baseName = this.sanitizeFileName(
			altText || this.getFallbackImageName(url).replace(/\.[^.]+$/, '')
		);
		const fileName = baseName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
			? baseName
			: `${baseName}.${extension}`;

		return new File([response.arrayBuffer], fileName, { type: mimeType });
	}

	private buildMarkdownImage(altText: string, imageUrl: string, fallbackName: string): string {
		const normalizedAltText = this.escapeMarkdownText(altText.trim() || fallbackName);
		return `![${normalizedAltText}](${imageUrl})`;
	}

	private escapeMarkdownText(value: string): string {
		return value.replace(/[\r\n\]]/g, ' ').trim();
	}

	private getFallbackImageName(path: string): string {
		const sanitizedPath = decodeURIComponent(path.split('?')[0].split('#')[0]).replace(/\\/g, '/');
		const segments = sanitizedPath.split('/');
		const lastSegment = segments[segments.length - 1] || 'image.png';
		return lastSegment || 'image.png';
	}

	private getExtensionFromUrl(url: string): string | null {
		try {
			const pathname = new URL(url).pathname;
			const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
			return match?.[1]?.toLowerCase() ?? null;
		} catch {
			return null;
		}
	}

	private getExtensionFromMimeType(mimeType: string): string | null {
		const mimeMap: Record<string, string> = {
			'image/apng': 'apng',
			'image/avif': 'avif',
			'image/bmp': 'bmp',
			'image/gif': 'gif',
			'image/heic': 'heic',
			'image/heif': 'heif',
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/svg+xml': 'svg',
			'image/webp': 'webp'
		};

		return mimeMap[mimeType] ?? null;
	}

	private getMimeTypeFromExtension(extension: string): string {
		const extensionMap: Record<string, string> = {
			apng: 'image/apng',
			avif: 'image/avif',
			bmp: 'image/bmp',
			gif: 'image/gif',
			heic: 'image/heic',
			heif: 'image/heif',
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			svg: 'image/svg+xml',
			webp: 'image/webp'
		};

		return extensionMap[extension.toLowerCase()] ?? 'application/octet-stream';
	}

	private sanitizeFileName(name: string): string {
		const trimmed = name.trim();
		if (!trimmed) {
			return 'image';
		}

		return trimmed.replace(/[\\/:*?"<>|]/g, '-');
	}

	private applyReplacements(text: string, replacements: TextReplacement[]): string {
		return replacements
			.sort((left, right) => right.index - left.index)
			.reduce((current, replacement) => {
				return (
					current.slice(0, replacement.index) +
					replacement.replacement +
					current.slice(replacement.index + replacement.length)
				);
			}, text);
	}

	private setEditorValue(editor: Editor, value: string): void {
		const scrollInfo = editor.getScrollInfo();
		const cursor = editor.getCursor();
		editor.setValue(value);
		editor.scrollTo(scrollInfo.left, scrollInfo.top);
		editor.setCursor(cursor);
	}

	private showRemotePasteSummary(successCount: number, failedCount: number): void {
		const settings = this.getSettings?.();
		if (successCount > 0 && settings?.showSuccessNotification) {
			new Notice(
				`网络图片上传完成：成功 ${successCount}，失败 ${failedCount}`,
				(settings.notificationDuration ?? 5) * 1000
			);
			return;
		}

		if (successCount === 0 && failedCount > 0 && settings?.showErrorNotification) {
			new Notice('网络图片上传失败，已保留原始内容', (settings.notificationDuration ?? 5) * 1000);
		}
	}

	private showBatchUploadSummary(successCount: number, failedCount: number, skippedCount: number): void {
		const settings = this.getSettings?.();
		if (successCount > 0 && settings?.showSuccessNotification) {
			const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount}` : '';
			new Notice(
				`当前文档图片上传完成：成功 ${successCount}，失败 ${failedCount}${skippedText}`,
				(settings.notificationDuration ?? 5) * 1000
			);
			return;
		}

		if (successCount === 0 && settings?.showErrorNotification) {
			const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount}` : '';
			new Notice(
				`当前文档图片上传失败：成功 0，失败 ${failedCount}${skippedText}`,
				(settings.notificationDuration ?? 5) * 1000
			);
		}
	}

	private getExcludedDomains(settings?: CFImageBedSettings): string[] {
		return getEffectiveExcludedDomains(
			settings?.apiUrl ?? '',
			settings?.excludedImageDomains ?? []
		);
	}

	private isExcludedRemoteUrl(url: string, domains: string[]): boolean {
		return isUrlExcluded(url, domains);
	}
}
