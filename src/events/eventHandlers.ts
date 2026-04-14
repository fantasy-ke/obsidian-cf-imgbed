import { Plugin, Menu, Editor, MarkdownView } from 'obsidian';
import { ImageHandler } from '../upload/imageHandler';
import { I18n } from '../utils/i18n';

export class EventHandlers {
	constructor(
		private imageHandler: ImageHandler,
		private i18n: I18n
	) {}

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
		plugin.registerEvent(
			plugin.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
				if (evt.defaultPrevented) {
					return;
				}

				void this.imageHandler.handleEditorPaste(evt, editor);
			})
		);
	}

	registerEditorMenuEvents(plugin: Plugin): void {
		// 添加编辑器菜单项（更多选项中的上传按钮）
		plugin.registerEvent(
			plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				menu.addItem((item) => {
					item
						.setTitle(this.i18n.t('menu.uploadImage'))
						.setIcon('upload')
						.onClick(() => {
							this.imageHandler.selectAndUploadImage();
						});
				});
			})
		);
	}
}
