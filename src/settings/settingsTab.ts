import { App, PluginSettingTab, Setting } from 'obsidian';
import CFImageBedPlugin from '../../main';
import { I18n } from '../utils/i18n';

export class CFImageBedSettingTab extends PluginSettingTab {
	plugin: CFImageBedPlugin;
	private i18n: I18n;

	constructor(app: App, plugin: CFImageBedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.i18n = new I18n(plugin.settings.language || 'zh');
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		// 更新语言
		this.i18n.setLanguage(this.plugin.settings.language || 'zh');
		
		// 添加插件专用的CSS类名，限制样式作用域
		containerEl.addClass('cf-imagebed-settings');

		new Setting(containerEl).setName(this.i18n.t('settings.title')).setHeading();
		
		// 语言设置（在顶部）
		new Setting(containerEl)
			.setName(this.i18n.t('settings.language.name'))
			.setDesc(this.i18n.t('settings.language.desc'))
			.addDropdown(dropdown => dropdown
				.addOption('zh', '中文')
				.addOption('en', 'English')
				.setValue(this.plugin.settings.language || 'zh')
				.onChange(async (value: 'zh' | 'en') => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
					this.i18n.setLanguage(value);
					// 重新渲染设置界面
					this.display();
				}));
		
		// 创建选项卡容器
		const tabContainer = containerEl.createDiv('cf-imagebed-tabs');
		const tabContent = containerEl.createDiv('cf-imagebed-tab-content');
		
		// 创建选项卡按钮
		const basicTab = tabContainer.createEl('button', { text: this.i18n.t('settings.tabs.basic'), cls: 'cf-tab-button active' });
		const advancedTab = tabContainer.createEl('button', { text: this.i18n.t('settings.tabs.advanced'), cls: 'cf-tab-button' });
		const userTab = tabContainer.createEl('button', { text: this.i18n.t('settings.tabs.userExperience'), cls: 'cf-tab-button' });
		const backupTab = tabContainer.createEl('button', { text: this.i18n.t('settings.tabs.backup'), cls: 'cf-tab-button' });
		
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
			.setName(this.i18n.t('settings.basic.apiUrl.name'))
			.setDesc(this.i18n.t('settings.basic.apiUrl.desc'))
			.addText(text => text
				.setPlaceholder('https://your.domain')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));  

		// 认证码设置
		new Setting(container)
			.setName(this.i18n.t('settings.basic.authCode.name'))
			.setDesc(this.i18n.t('settings.basic.authCode.desc'))
			.addText(text => text
				.setPlaceholder('your_authCode')
				.setValue(this.plugin.settings.authCode)
				.onChange(async (value) => {
					this.plugin.settings.authCode = value;
					await this.plugin.saveSettings();
				}));

		// 上传渠道设置
		new Setting(container)
			.setName(this.i18n.t('settings.basic.uploadChannel.name'))
			.setDesc(this.i18n.t('settings.basic.uploadChannel.desc'))
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
			.setName(this.i18n.t('settings.basic.uploadNameType.name'))
			.setDesc(this.i18n.t('settings.basic.uploadNameType.desc'))
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
			.setName(this.i18n.t('settings.basic.returnFormat.name'))
			.setDesc(this.i18n.t('settings.basic.returnFormat.desc'))
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
			.setName(this.i18n.t('settings.basic.uploadFolder.name'))
			.setDesc(this.i18n.t('settings.basic.uploadFolder.desc'))
			.addText(text => text
				.setPlaceholder('img/test')
				.setValue(this.plugin.settings.uploadFolder)
				.onChange(async (value) => {
					this.plugin.settings.uploadFolder = value;
					await this.plugin.saveSettings();
				}));

		// 服务端压缩设置
		new Setting(container)
			.setName(this.i18n.t('settings.basic.serverCompress.name'))
			.setDesc(this.i18n.t('settings.basic.serverCompress.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.serverCompress)
				.onChange(async (value) => {
					this.plugin.settings.serverCompress = value;
					await this.plugin.saveSettings();
				}));

		// 自动重试设置
		new Setting(container)
			.setName(this.i18n.t('settings.basic.autoRetry.name'))
			.setDesc(this.i18n.t('settings.basic.autoRetry.desc'))
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
			.setName(this.i18n.t('settings.advanced.maxFileSize.name'))
			.setDesc(this.i18n.t('settings.advanced.maxFileSize.desc'))
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
			.setName(this.i18n.t('settings.advanced.allowedFileTypes.name'))
			.setDesc(this.i18n.t('settings.advanced.allowedFileTypes.desc'))
			.addText(text => text
				.setPlaceholder('jpg,jpeg,png,gif,webp,bmp')
				.setValue(this.plugin.settings.allowedFileTypes.join(','))
				.onChange(async (value) => {
					this.plugin.settings.allowedFileTypes = value.split(',').map(t => t.trim());
					await this.plugin.saveSettings();
				}));

		// 水印设置
		new Setting(container)
			.setName(this.i18n.t('settings.advanced.enableWatermark.name'))
			.setDesc(this.i18n.t('settings.advanced.enableWatermark.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableWatermark)
				.onChange(async (value) => {
					this.plugin.settings.enableWatermark = value;
					await this.plugin.saveSettings();
					// 不刷新页面，通过控件的 disabled 逻辑生效
					const fields = container.querySelectorAll('input, select');
					fields.forEach((el) => {
						const label = (el.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent || '').trim();
						const dependent = [
							this.i18n.t('settings.advanced.watermarkText.name'),
							this.i18n.t('settings.advanced.watermarkPosition.name'),
							this.i18n.t('settings.advanced.watermarkSize.name'),
							this.i18n.t('settings.advanced.watermarkOpacity.name')
						];
						if (dependent.some(d => label.includes(d))) {
							(el as HTMLInputElement | HTMLSelectElement).disabled = !value;
						}
					});
				}));

		// 水印文字
		new Setting(container)
			.setName(this.i18n.t('settings.advanced.watermarkText.name'))
			.setDesc(this.i18n.t('settings.advanced.watermarkText.desc'))
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
			.setName(this.i18n.t('settings.advanced.watermarkPosition.name'))
			.setDesc(this.i18n.t('settings.advanced.watermarkPosition.desc'))
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
			.setName(this.i18n.t('settings.advanced.watermarkSize.name'))
			.setDesc(this.i18n.t('settings.advanced.watermarkSize.desc'))
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
			.setName(this.i18n.t('settings.advanced.watermarkOpacity.name'))
			.setDesc(this.i18n.t('settings.advanced.watermarkOpacity.desc'))
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
			.setName(this.i18n.t('settings.advanced.enableClientCompress.name'))
			.setDesc(this.i18n.t('settings.advanced.enableClientCompress.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableClientCompress)
				.onChange(async (value) => {
					this.plugin.settings.enableClientCompress = value;
					await this.plugin.saveSettings();
					// 不刷新页面，直接切换阈值与目标大小的禁用状态
					const fields = container.querySelectorAll('input');
					fields.forEach((el) => {
						const label = (el.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent || '').trim();
						const dependent = [
							this.i18n.t('settings.advanced.compressThreshold.name'),
							this.i18n.t('settings.advanced.targetSize.name')
						];
						if (dependent.some(d => label.includes(d))) {
							(el as HTMLInputElement).disabled = !value;
						}
					});
				}));

		// 压缩阈值
		new Setting(container)
			.setName(this.i18n.t('settings.advanced.compressThreshold.name'))
			.setDesc(this.i18n.t('settings.advanced.compressThreshold.desc'))
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
			.setName(this.i18n.t('settings.advanced.targetSize.name'))
			.setDesc(this.i18n.t('settings.advanced.targetSize.desc'))
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
			.setName(this.i18n.t('settings.userExperience.showUploadProgress.name'))
			.setDesc(this.i18n.t('settings.userExperience.showUploadProgress.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showUploadProgress)
				.onChange(async (value) => {
					this.plugin.settings.showUploadProgress = value;
					await this.plugin.saveSettings();
				}));

		// 显示成功通知
		new Setting(container)
			.setName(this.i18n.t('settings.userExperience.showSuccessNotification.name'))
			.setDesc(this.i18n.t('settings.userExperience.showSuccessNotification.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSuccessNotification)
				.onChange(async (value) => {
					this.plugin.settings.showSuccessNotification = value;
					await this.plugin.saveSettings();
				}));

		// 显示错误通知
		new Setting(container)
			.setName(this.i18n.t('settings.userExperience.showErrorNotification.name'))
			.setDesc(this.i18n.t('settings.userExperience.showErrorNotification.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showErrorNotification)
				.onChange(async (value) => {
					this.plugin.settings.showErrorNotification = value;
					await this.plugin.saveSettings();
				}));

		// 通知持续时间
		new Setting(container)
			.setName(this.i18n.t('settings.userExperience.notificationDuration.name'))
			.setDesc(this.i18n.t('settings.userExperience.notificationDuration.desc'))
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
			.setName(this.i18n.t('settings.backup.enableLocalBackup.name'))
			.setDesc(this.i18n.t('settings.backup.enableLocalBackup.desc'))
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
			.setName(this.i18n.t('settings.backup.backupPath.name'))
			.setDesc(this.i18n.t('settings.backup.backupPath.desc'))
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
