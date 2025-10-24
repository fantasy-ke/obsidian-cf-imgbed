import { App, MarkdownView, Notice } from 'obsidian';
import { UploadService } from './uploadService';

export class ImageHandler {
	constructor(
		private app: App,
		private uploadService: UploadService
	) {}

	async uploadImageFromFile(file: File, deleteLocal: boolean = false): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

		new Notice('正在上传图片...');
		const imageUrl = await this.uploadService.uploadImage(file);
		
		if (imageUrl) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			const markdownImage = `![${file.name}](${imageUrl})`;
			editor.replaceRange(markdownImage, cursor);
			new Notice(`图片上传成功：${imageUrl}`, 5000);
		}
	}

	async uploadImageAtCursor(file: File): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个 Markdown 文件');
			return;
		}

		new Notice('正在上传图片...');
		const imageUrl = await this.uploadService.uploadImage(file);
		
		if (imageUrl) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			const markdownImage = `![${file.name}](${imageUrl})`;
			editor.replaceRange(markdownImage, cursor);
			new Notice(`图片上传成功：${imageUrl}`, 5000);
		}
	}

	selectAndUploadImage(): void {
		// 检查是否在移动端环境
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		
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
				this.uploadImageFromFile(file, false);
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
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		
		if (!isMobile) {
			// 桌面端直接使用原有方法
			this.selectAndUploadImage();
			return;
		}

		// 创建选择对话框
		const modal = document.createElement('div');
		modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0,0,0,0.6);
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 10000;
			backdrop-filter: blur(4px);
		`;

		const dialog = document.createElement('div');
		dialog.style.cssText = `
			background: #ffffff;
			border-radius: 16px;
			padding: 24px;
			box-shadow: 0 8px 32px rgba(0,0,0,0.2);
			text-align: center;
			max-width: 320px;
			width: 90%;
			margin: 20px;
		`;

		const title = document.createElement('h3');
		title.textContent = '选择图片来源';
		title.style.cssText = `
			margin: 0 0 24px 0;
			font-size: 18px;
			font-weight: 600;
			color: #333;
		`;

		const buttonContainer = document.createElement('div');
		buttonContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 12px;
		`;

		const cameraBtn = document.createElement('button');
		cameraBtn.textContent = '📷 拍照';
		cameraBtn.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			padding: 16px 20px;
			border: none;
			border-radius: 12px;
			background: linear-gradient(135deg, #007acc, #0056b3);
			color: white;
			font-size: 16px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
			box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
		`;

		const galleryBtn = document.createElement('button');
		galleryBtn.textContent = '🖼️ 从相册选择';
		galleryBtn.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			padding: 16px 20px;
			border: none;
			border-radius: 12px;
			background: linear-gradient(135deg, #28a745, #1e7e34);
			color: white;
			font-size: 16px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
			box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
		`;

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = '取消';
		cancelBtn.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			padding: 12px 20px;
			border: 2px solid #e9ecef;
			border-radius: 12px;
			background: transparent;
			color: #6c757d;
			font-size: 16px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
		`;

		// 添加按钮悬停效果
		cameraBtn.onmouseenter = () => {
			cameraBtn.style.transform = 'translateY(-2px)';
			cameraBtn.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.4)';
		};
		cameraBtn.onmouseleave = () => {
			cameraBtn.style.transform = 'translateY(0)';
			cameraBtn.style.boxShadow = '0 2px 8px rgba(0, 122, 204, 0.3)';
		};

		galleryBtn.onmouseenter = () => {
			galleryBtn.style.transform = 'translateY(-2px)';
			galleryBtn.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
		};
		galleryBtn.onmouseleave = () => {
			galleryBtn.style.transform = 'translateY(0)';
			galleryBtn.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
		};

		cancelBtn.onmouseenter = () => {
			cancelBtn.style.backgroundColor = '#f8f9fa';
			cancelBtn.style.borderColor = '#dee2e6';
		};
		cancelBtn.onmouseleave = () => {
			cancelBtn.style.backgroundColor = 'transparent';
			cancelBtn.style.borderColor = '#e9ecef';
		};

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
					this.uploadImageFromFile(file, false);
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
					this.uploadImageFromFile(file, false);
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
