import { App, MarkdownView, Notice, Platform } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { UploadService } from './uploadService';

export class ImageHandler {
    constructor(
        private app: App,
        private uploadService: UploadService,
        private getSettings?: () => CFImageBedSettings
    ) {}

	async uploadImageFromFile(file: File, deleteLocal: boolean = false): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

        const settings = this.getSettings?.();
        if (settings?.showUploadProgress) {
            new Notice('正在上传图片...');
        }
		const imageUrl = await this.uploadService.uploadImage(file);
		
		if (imageUrl) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			const markdownImage = `![${file.name}](${imageUrl})`;
			editor.replaceRange(markdownImage, cursor);
            if (settings?.showSuccessNotification) {
                new Notice(`图片上传成功：${imageUrl}`, (settings.notificationDuration ?? 5) * 1000);
            }
		}
	}

	async uploadImageAtCursor(file: File): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

        const settings = this.getSettings?.();
        if (settings?.showUploadProgress) {
            new Notice('正在上传图片...');
        }
		const imageUrl = await this.uploadService.uploadImage(file);
		
		if (imageUrl) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			const markdownImage = `![${file.name}](${imageUrl})`;
			editor.replaceRange(markdownImage, cursor);
            if (settings?.showSuccessNotification) {
                new Notice(`图片上传成功：${imageUrl}`, (settings.notificationDuration ?? 5) * 1000);
            }
		}
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
		title.textContent = 'Select image source';
		title.className = 'cf-imagebed-dialog-title';

		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'cf-imagebed-button-container';

		const cameraBtn = document.createElement('button');
		cameraBtn.textContent = '📷 Take photo';
		cameraBtn.className = 'cf-imagebed-camera-btn';

		const galleryBtn = document.createElement('button');
		galleryBtn.textContent = '🖼️ Select from gallery';
		galleryBtn.className = 'cf-imagebed-gallery-btn';

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
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
}
