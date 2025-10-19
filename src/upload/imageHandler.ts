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
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				// 按钮上传时不删除本地文件
				this.uploadImageFromFile(file, false);
			}
		};
		input.click();
	}
}
