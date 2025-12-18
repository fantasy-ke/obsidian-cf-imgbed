import { Plugin, Menu, Editor, MarkdownView } from 'obsidian';
import { ImageHandler } from '../upload/imageHandler';

export class EventHandlers {
	constructor(private imageHandler: ImageHandler) {}

	registerDragAndDropEvents(plugin: Plugin): void {
		// 添加拖拽上传功能
		plugin.registerDomEvent(document, 'dragover', (evt: DragEvent) => {
			evt.preventDefault();
		});

		plugin.registerDomEvent(document, 'drop', (evt: DragEvent) => {
			const files = evt.dataTransfer?.files;
			if (files && files.length > 0) {
				const imageFiles = Array.from(files).filter(file => 
					file.type.startsWith('image/')
				);
				if (imageFiles.length > 0) {
					// 阻止默认的拖拽行为，防止 Obsidian 创建本地文件
					evt.preventDefault();
					evt.stopPropagation();
					// 上传图片
					void this.imageHandler.uploadImageFromFile(imageFiles[0]);
					return;
				}
			}
		}, true); // 使用捕获阶段，确保优先处理
	}

	registerPasteEvents(plugin: Plugin): void {
		// 添加粘贴上传功能 - 使用 DOM 事件监听
		plugin.registerDomEvent(document, 'paste', (evt: ClipboardEvent) => {
			const items = evt.clipboardData?.items;
			if (items) {
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					if (item.type.startsWith('image/')) {
						const file = item.getAsFile();
						if (file) {
							// 阻止默认的粘贴行为，防止 Obsidian 创建本地文件
							evt.preventDefault();
							evt.stopPropagation();
							// 上传图片
							void this.imageHandler.uploadImageFromFile(file, true);
							return;
						}
					}
				}
			}
		}, true); // 使用捕获阶段，确保优先处理
	}

	registerEditorMenuEvents(plugin: Plugin): void {
		// 添加编辑器菜单项（更多选项中的上传按钮）
		plugin.registerEvent(
			plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				menu.addItem((item) => {
					item
						.setTitle('Upload image to CF ImageBed')
						.setIcon('upload')
						.onClick(() => {
							this.imageHandler.selectAndUploadImage();
						});
				});
			})
		);
	}
}
