import { App, PluginSettingTab, Setting } from 'obsidian';
import { CFImageBedSettings } from '../types';

export class CFImageBedSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'CF ImageBed 设置' });

		// API URL 设置
		new Setting(containerEl)
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
		new Setting(containerEl)
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
		new Setting(containerEl)
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
		new Setting(containerEl)
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
		new Setting(containerEl)
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
		new Setting(containerEl)
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
		new Setting(containerEl)
			.setName('服务端压缩')
			.setDesc('启用服务端压缩（仅针对 Telegram 渠道的图片文件）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.serverCompress)
				.onChange(async (value) => {
					this.plugin.settings.serverCompress = value;
					await this.plugin.saveSettings();
				}));

		// 自动重试设置
		new Setting(containerEl)
			.setName('自动重试')
			.setDesc('失败时自动切换渠道重试')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRetry)
				.onChange(async (value) => {
					this.plugin.settings.autoRetry = value;
					await this.plugin.saveSettings();
				}));
	}
}
