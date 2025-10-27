import { App, PluginSettingTab, Setting } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { SettingsValidator } from './settingsValidator';

export class CFImageBedSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		// 添加插件专用的CSS类名，限制样式作用域
		containerEl.addClass('cf-imagebed-settings');

		containerEl.createEl('h2', { text: 'CF ImageBed 设置' });
		
		// 创建选项卡容器
		const tabContainer = containerEl.createDiv('cf-imagebed-tabs');
		const tabContent = containerEl.createDiv('cf-imagebed-tab-content');
		
		// 创建选项卡按钮
		const basicTab = tabContainer.createEl('button', { text: '基础设置', cls: 'cf-tab-button active' });
		const advancedTab = tabContainer.createEl('button', { text: '高级设置', cls: 'cf-tab-button' });
		const userTab = tabContainer.createEl('button', { text: '用户体验', cls: 'cf-tab-button' });
		const backupTab = tabContainer.createEl('button', { text: '备份设置', cls: 'cf-tab-button' });
		
		// 创建选项卡内容区域
		const basicContent = tabContent.createDiv('cf-tab-panel active');
		const advancedContent = tabContent.createDiv('cf-tab-panel');
		const userContent = tabContent.createDiv('cf-tab-panel');
		const backupContent = tabContent.createDiv('cf-tab-panel');
		
		// 选项卡切换逻辑
		const switchTab = (activeTab: HTMLElement, activeContent: HTMLElement) => {
			// 移除所有活动状态
			tabContainer.querySelectorAll('.cf-tab-button').forEach(btn => btn.classList.remove('active'));
			tabContent.querySelectorAll('.cf-tab-panel').forEach(panel => panel.classList.remove('active'));
			
			// 添加活动状态
			activeTab.classList.add('active');
			activeContent.classList.add('active');
		};
		
		basicTab.addEventListener('click', () => switchTab(basicTab, basicContent));
		advancedTab.addEventListener('click', () => switchTab(advancedTab, advancedContent));
		userTab.addEventListener('click', () => switchTab(userTab, userContent));
		backupTab.addEventListener('click', () => switchTab(backupTab, backupContent));

		// 基础设置选项卡内容
		this.createBasicSettings(basicContent);
		
		// 高级设置选项卡内容
		this.createAdvancedSettings(advancedContent);
		
		// 用户体验选项卡内容
		this.createUserExperienceSettings(userContent);
		
		// 备份设置选项卡内容
		this.createBackupSettings(backupContent);
	}
	
	private createBasicSettings(container: HTMLElement): void {
		// API URL 设置
		new Setting(container)
			.setName('API URL')
			.setDesc('CloudFlare ImgBed 的 API 地址（例如：https://your.domain）')
			.addText(text => text
				.setPlaceholder('https://your.domain')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));  

		// 认证码设置
		new Setting(container)
			.setName('认证码')
			.setDesc('上传认证码')
			.addText(text => text
				.setPlaceholder('your_authCode')
				.setValue(this.plugin.settings.authCode)
				.onChange(async (value) => {
					this.plugin.settings.authCode = value;
					await this.plugin.saveSettings();
				}));

		// 上传渠道设置
		new Setting(container)
			.setName('上传渠道')
			.setDesc('选择上传渠道')
			.addDropdown(dropdown => dropdown
				.addOption('telegram', 'Telegram')
				.addOption('cfr2', 'CloudFlare R2')
				.addOption('s3', 'S3')
				.setValue(this.plugin.settings.uploadChannel)
				.onChange(async (value) => {
					this.plugin.settings.uploadChannel = value;
					await this.plugin.saveSettings();
				}));

		// 文件命名方式设置
		new Setting(container)
			.setName('文件命名方式')
			.setDesc('选择文件命名方式')
			.addDropdown(dropdown => dropdown
				.addOption('default', '默认前缀_原名命名')
				.addOption('index', '仅前缀命名')
				.addOption('origin', '仅原名命名')
				.addOption('short', '短链接命名法')
				.setValue(this.plugin.settings.uploadNameType)
				.onChange(async (value) => {
					this.plugin.settings.uploadNameType = value;
					await this.plugin.saveSettings();
				}));

		// 返回格式设置
		new Setting(container)
			.setName('返回链接格式')
			.setDesc('选择返回链接格式')
			.addDropdown(dropdown => dropdown
				.addOption('default', '默认格式 /file/id')
				.addOption('full', '完整链接格式')
				.setValue(this.plugin.settings.returnFormat)
				.onChange(async (value) => {
					this.plugin.settings.returnFormat = value;
					await this.plugin.saveSettings();
				}));

		// 上传目录设置
		new Setting(container)
			.setName('上传目录')
			.setDesc('上传目录，用相对路径表示（例如：img/test）')
			.addText(text => text
				.setPlaceholder('img/test')
				.setValue(this.plugin.settings.uploadFolder)
				.onChange(async (value) => {
					this.plugin.settings.uploadFolder = value;
					await this.plugin.saveSettings();
				}));

		// 服务端压缩设置
		new Setting(container)
			.setName('服务端压缩')
			.setDesc('启用服务端压缩（仅针对 Telegram 渠道的图片文件）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.serverCompress)
				.onChange(async (value) => {
					this.plugin.settings.serverCompress = value;
					await this.plugin.saveSettings();
				}));

		// 自动重试设置
		new Setting(container)
			.setName('自动重试')
			.setDesc('失败时自动切换渠道重试')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRetry)
				.onChange(async (value) => {
					this.plugin.settings.autoRetry = value;
					await this.plugin.saveSettings();
				}));
	}
	
	private createAdvancedSettings(container: HTMLElement): void {
		// 文件大小限制
		new Setting(container)
			.setName('最大文件大小')
			.setDesc('设置上传文件的最大大小（MB）')
			.addSlider(slider => slider
				.setLimits(1, 50, 1)
				.setValue(this.plugin.settings.maxFileSize)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxFileSize = value;
					await this.plugin.saveSettings();
				}));

		// 允许的文件类型
		new Setting(container)
			.setName('允许的文件类型')
			.setDesc('设置允许上传的文件类型（用逗号分隔）')
			.addText(text => text
				.setPlaceholder('jpg,jpeg,png,gif,webp,bmp')
				.setValue(this.plugin.settings.allowedFileTypes.join(','))
				.onChange(async (value) => {
					this.plugin.settings.allowedFileTypes = value.split(',').map(t => t.trim());
					await this.plugin.saveSettings();
				}));

		// 水印设置
		new Setting(container)
			.setName('启用水印')
			.setDesc('为上传的图片添加水印')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.enableWatermark = value;
					await this.plugin.saveSettings();
				}));

		// 水印文字
		new Setting(container)
			.setName('水印文字')
			.setDesc('设置水印文字内容')
			.addText(text => text
				.setPlaceholder('水印文字')
				.setValue(this.plugin.settings.watermarkText)
				.setDisabled(!this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.watermarkText = value;
					await this.plugin.saveSettings();
				}));

		// 水印位置
		new Setting(container)
			.setName('水印位置')
			.setDesc('设置水印在图片中的位置')
			.addDropdown(dropdown => dropdown
				.addOption('top-left', '左上角')
				.addOption('top-right', '右上角')
				.addOption('bottom-left', '左下角')
				.addOption('bottom-right', '右下角')
				.addOption('center', '居中')
				.setValue(this.plugin.settings.watermarkPosition)
				.setDisabled(!this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.watermarkPosition = value;
					await this.plugin.saveSettings();
				}));

		// 水印字体大小
		new Setting(container)
			.setName('水印字体大小')
			.setDesc('设置水印文字的字体大小（像素）')
			.addSlider(slider => slider
				.setLimits(12, 72, 2)
				.setValue(this.plugin.settings.watermarkSize)
				.setDynamicTooltip()
				.setDisabled(!this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.watermarkSize = value;
					await this.plugin.saveSettings();
				}));

		// 水印透明度
		new Setting(container)
			.setName('水印透明度')
			.setDesc('设置水印的透明度（0-1）')
			.addSlider(slider => slider
				.setLimits(0.1, 1, 0.1)
				.setValue(this.plugin.settings.watermarkOpacity)
				.setDynamicTooltip()
				.setDisabled(!this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.watermarkOpacity = value;
					await this.plugin.saveSettings();
				}));

		// 客户端压缩设置
		new Setting(container)
			.setName('启用客户端压缩')
			.setDesc('在上传前自动压缩图片以减少文件大小')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableClientCompress)
				.onChange(async (value) => {
					this.plugin.settings.enableClientCompress = value;
					await this.plugin.saveSettings();
				}));

		// 压缩阈值
		new Setting(container)
			.setName('压缩阈值')
			.setDesc('设置图片大小阈值，超过此值将自动压缩（MB）')
			.addSlider(slider => slider
				.setLimits(0.5, 10, 0.5)
				.setValue(this.plugin.settings.compressThreshold)
				.setDynamicTooltip()
				.setDisabled(!this.plugin.settings.enableClientCompress)
				.onChange(async (value) => {
					this.plugin.settings.compressThreshold = value;
					await this.plugin.saveSettings();
				}));

		// 期望大小
		new Setting(container)
			.setName('期望大小')
			.setDesc('设置压缩后图片大小期望值（MB）')
			.addSlider(slider => slider
				.setLimits(0.1, 5, 0.1)
				.setValue(this.plugin.settings.targetSize)
				.setDynamicTooltip()
				.setDisabled(!this.plugin.settings.enableClientCompress)
				.onChange(async (value) => {
					this.plugin.settings.targetSize = value;
					await this.plugin.saveSettings();
				}));
	}
	
	private createUserExperienceSettings(container: HTMLElement): void {
		// 显示上传进度
		new Setting(container)
			.setName('显示上传进度')
			.setDesc('在上传过程中显示进度条')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showUploadProgress)
				.onChange(async (value) => {
					this.plugin.settings.showUploadProgress = value;
					await this.plugin.saveSettings();
				}));

		// 显示成功通知
		new Setting(container)
			.setName('显示成功通知')
			.setDesc('上传成功后显示通知消息')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSuccessNotification)
				.onChange(async (value) => {
					this.plugin.settings.showSuccessNotification = value;
					await this.plugin.saveSettings();
				}));

		// 显示错误通知
		new Setting(container)
			.setName('显示错误通知')
			.setDesc('上传失败时显示错误消息')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showErrorNotification)
				.onChange(async (value) => {
					this.plugin.settings.showErrorNotification = value;
					await this.plugin.saveSettings();
				}));

		// 通知持续时间
		new Setting(container)
			.setName('通知持续时间')
			.setDesc('设置通知消息显示的持续时间（秒）')
			.addSlider(slider => slider
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.notificationDuration)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.notificationDuration = value;
					await this.plugin.saveSettings();
				}));

		// 快捷键设置
		new Setting(container)
			.setName('启用快捷键')
			.setDesc('启用快捷键快速上传图片')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHotkey)
				.onChange(async (value) => {
					this.plugin.settings.enableHotkey = value;
					await this.plugin.saveSettings();
				}));

		// 快捷键
		new Setting(container)
			.setName('快捷键')
			.setDesc('设置上传图片的快捷键')
			.addText(text => text
				.setPlaceholder('Ctrl+Shift+U')
				.setValue(this.plugin.settings.hotkey)
				.setDisabled(!this.plugin.settings.enableHotkey)
				.onChange(async (value) => {
					this.plugin.settings.hotkey = value;
					await this.plugin.saveSettings();
				}));
	}
	
	private createBackupSettings(container: HTMLElement): void {
		// 启用本地备份
		new Setting(container)
			.setName('启用本地备份')
			.setDesc('在上传到云端的同时，在本地保存一份备份')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLocalBackup)
				.onChange(async (value) => {
					this.plugin.settings.enableLocalBackup = value;
					await this.plugin.saveSettings();
				}));

		// 备份路径
		new Setting(container)
			.setName('备份路径')
			.setDesc('设置本地备份的存储路径（相对于库根目录）')
			.addText(text => text
				.setPlaceholder('attachments/backup')
				.setValue(this.plugin.settings.backupPath)
				.setDisabled(!this.plugin.settings.enableLocalBackup)
				.onChange(async (value) => {
					this.plugin.settings.backupPath = value;
					await this.plugin.saveSettings();
				}));
	}
	
}
