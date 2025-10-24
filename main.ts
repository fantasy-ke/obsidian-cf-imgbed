import { App, Editor, MarkdownView, Plugin } from 'obsidian';
import { CFImageBedSettings, DEFAULT_SETTINGS } from './src/types';
import { UploadService } from './src/upload/uploadService';
import { ImageHandler } from './src/upload/imageHandler';
import { EventHandlers } from './src/events/eventHandlers';
import { CFImageBedSettingTab } from './src/settings/settingsTab';

export default class CFImageBedPlugin extends Plugin {
	settings: CFImageBedSettings;
	private uploadService: UploadService;
	private imageHandler: ImageHandler;
	private eventHandlers: EventHandlers;

	async onload() {
		await this.loadSettings();

		// 初始化服务
		this.uploadService = new UploadService(this.settings);
		this.imageHandler = new ImageHandler(this.app, this.uploadService);
		this.eventHandlers = new EventHandlers(this.imageHandler);

		// 注册事件处理器
		this.eventHandlers.registerDragAndDropEvents(this);
		this.eventHandlers.registerPasteEvents(this);
		this.eventHandlers.registerEditorMenuEvents(this);

		// 移动端专用命令：支持相机拍照和相册选择
		this.addCommand({
			id: 'upload-image-mobile',
			name: '📷 拍照或相册选择',
			icon: 'camera',
			callback: () => {
				this.imageHandler.selectImageForMobile();
			}
		});

		// 添加设置页面
		this.addSettingTab(new CFImageBedSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
