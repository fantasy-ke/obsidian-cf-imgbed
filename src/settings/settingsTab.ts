import { App, PluginSettingTab, Setting } from 'obsidian';
import CFImageBedPlugin from '../../main';

export class CFImageBedSettingTab extends PluginSettingTab {
	plugin: CFImageBedPlugin;

	constructor(app: App, plugin: CFImageBedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		// 添加插件专用的CSS类名，限制样式作用域
		containerEl.addClass('cf-imagebed-settings');

		new Setting(containerEl).setName('CF ImageBed settings').setHeading();
		
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
			.setDesc('CloudFlare ImgBed API address (e.g., https://your.domain)')
			.addText(text => text
				.setPlaceholder('https://your.domain')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));  

		// 认证码设置
		new Setting(container)
			.setName('Auth code')
			.setDesc('Upload authentication code')
			.addText(text => text
				.setPlaceholder('your_authCode')
				.setValue(this.plugin.settings.authCode)
				.onChange(async (value) => {
					this.plugin.settings.authCode = value;
					await this.plugin.saveSettings();
				}));

		// 上传渠道设置
		new Setting(container)
			.setName('Upload channel')
			.setDesc('Select upload channel')
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
			.setName('File naming method')
			.setDesc('Select file naming method')
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
			.setName('Return link format')
			.setDesc('Select return link format')
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
			.setName('Upload folder')
			.setDesc('Upload folder, use relative path (e.g., img/test)')
			.addText(text => text
				.setPlaceholder('img/test')
				.setValue(this.plugin.settings.uploadFolder)
				.onChange(async (value) => {
					this.plugin.settings.uploadFolder = value;
					await this.plugin.saveSettings();
				}));

		// 服务端压缩设置
		new Setting(container)
			.setName('Server compression')
			.setDesc('Enable server-side compression (only for Telegram channel image files)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.serverCompress)
				.onChange(async (value) => {
					this.plugin.settings.serverCompress = value;
					await this.plugin.saveSettings();
				}));

		// 自动重试设置
		new Setting(container)
			.setName('Auto retry')
			.setDesc('Automatically switch channels and retry on failure')
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
			.setName('Maximum file size')
			.setDesc('Set maximum size for uploaded files (MB)')
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
			.setName('Allowed file types')
			.setDesc('Set allowed file types for upload (comma-separated)')
			.addText(text => text
				.setPlaceholder('jpg,jpeg,png,gif,webp,bmp')
				.setValue(this.plugin.settings.allowedFileTypes.join(','))
				.onChange(async (value) => {
					this.plugin.settings.allowedFileTypes = value.split(',').map(t => t.trim());
					await this.plugin.saveSettings();
				}));

		// 水印设置
		new Setting(container)
			.setName('Enable watermark')
			.setDesc('Add watermark to uploaded images')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.enableWatermark = value;
					await this.plugin.saveSettings();
					// 不刷新页面，通过控件的 disabled 逻辑生效
					const fields = container.querySelectorAll('input, select');
					fields.forEach((el) => {
						const label = (el.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent || '').trim();
						const dependent = ['Watermark text', 'Watermark position', 'Watermark font size', 'Watermark opacity'];
						if (dependent.some(d => label.includes(d))) {
							(el as HTMLInputElement | HTMLSelectElement).disabled = !value;
						}
					});
				}));

		// 水印文字
		new Setting(container)
			.setName('Watermark text')
			.setDesc('Set watermark text content')
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
			.setName('Watermark position')
			.setDesc('Set watermark position in image')
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
			.setName('Watermark font size')
			.setDesc('Set watermark text font size (pixels)')
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
			.setName('Watermark opacity')
			.setDesc('Set watermark opacity (0-1)')
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
			.setName('Enable client compression')
			.setDesc('Automatically compress images before upload to reduce file size')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableClientCompress)
				.onChange(async (value) => {
					this.plugin.settings.enableClientCompress = value;
					await this.plugin.saveSettings();
					// 不刷新页面，直接切换阈值与目标大小的禁用状态
					const fields = container.querySelectorAll('input');
					fields.forEach((el) => {
						const label = (el.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent || '').trim();
						const dependent = ['Compression threshold', 'Target size'];
						if (dependent.some(d => label.includes(d))) {
							(el as HTMLInputElement).disabled = !value;
						}
					});
				}));

		// 压缩阈值
		new Setting(container)
			.setName('Compression threshold')
			.setDesc('Set image size threshold, files exceeding this will be automatically compressed (MB)')
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
			.setName('Target size')
			.setDesc('Set expected size for compressed images (MB)')
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
			.setName('Show upload progress')
			.setDesc('Show progress information during upload')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showUploadProgress)
				.onChange(async (value) => {
					this.plugin.settings.showUploadProgress = value;
					await this.plugin.saveSettings();
				}));

		// 显示成功通知
		new Setting(container)
			.setName('Show success notification')
			.setDesc('Show notification message on successful upload')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSuccessNotification)
				.onChange(async (value) => {
					this.plugin.settings.showSuccessNotification = value;
					await this.plugin.saveSettings();
				}));

		// 显示错误通知
		new Setting(container)
			.setName('Show error notification')
			.setDesc('Show error message when upload fails')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showErrorNotification)
				.onChange(async (value) => {
					this.plugin.settings.showErrorNotification = value;
					await this.plugin.saveSettings();
				}));

		// 通知持续时间
		new Setting(container)
			.setName('Notification duration')
			.setDesc('Set duration for notification display (seconds)')
			.addSlider(slider => slider
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.notificationDuration)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.notificationDuration = value;
					await this.plugin.saveSettings();
				}));

		// 快捷键设置已移除
	}
	
	private createBackupSettings(container: HTMLElement): void {
		// 启用本地备份
		new Setting(container)
			.setName('Enable local backup')
			.setDesc('Save a local backup while uploading to cloud')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLocalBackup)
				.onChange(async (value) => {
					this.plugin.settings.enableLocalBackup = value;
					await this.plugin.saveSettings();
					// 不刷新页面，直接切换备份路径输入框
					const input = container.querySelector('input');
					if (input) input.disabled = !value;
				}));

		// 备份路径
		new Setting(container)
			.setName('Backup path')
			.setDesc('Set local backup storage path (relative to vault root)')
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
