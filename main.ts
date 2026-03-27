import { MarkdownView, Plugin } from 'obsidian';
import { CFImageBedSettings, DEFAULT_SETTINGS } from './src/types';
import { UploadService } from './src/upload/uploadService';
import { ImageHandler } from './src/upload/imageHandler';
import { EventHandlers } from './src/events/eventHandlers';
import { CFImageBedSettingTab } from './src/settings/settingsTab';
import { I18n } from './src/utils/i18n';
import { parseDomainList } from './src/utils/domainUtils';

export default class CFImageBedPlugin extends Plugin {
	settings: CFImageBedSettings;
	private uploadService: UploadService;
	private imageHandler: ImageHandler;
	private eventHandlers: EventHandlers;
	private i18n: I18n;

	async onload() {
		await this.loadSettings();

		// 初始化i18n
		this.i18n = new I18n(this.settings.language || 'zh');

		// 初始化服务
		this.uploadService = new UploadService(this.settings);
		this.imageHandler = new ImageHandler(this.app, this.uploadService, () => this.settings, this.i18n);
		this.eventHandlers = new EventHandlers(this.imageHandler, this.i18n);

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

		this.addCommand({
			id: 'upload-current-note-images',
			name: this.i18n.t('commands.uploadCurrentNoteImages'),
			checkCallback: (checking: boolean) => {
				const hasMarkdownView = Boolean(this.app.workspace.getActiveViewOfType(MarkdownView));
				if (!checking && hasMarkdownView) {
					void this.imageHandler.uploadCurrentNoteImages();
				}
				return hasMarkdownView;
			}
		});

		// 添加设置页面
		this.addSettingTab(new CFImageBedSettingTab(this.app, this));
	}

	onunload() {

	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.excludedImageDomains = parseDomainList(
			(this.settings.excludedImageDomains || []).join(',')
		);
	}

	async saveSettings() {
		this.settings.excludedImageDomains = parseDomainList(
			(this.settings.excludedImageDomains || []).join(',')
		);
		await this.saveData(this.settings);
	}
}
