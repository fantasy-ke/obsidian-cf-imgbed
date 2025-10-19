import { Notice } from 'obsidian';
import { CFImageBedSettings } from '../types';

export class UploadService {
	constructor(private settings: CFImageBedSettings) {}

	async uploadImage(file: File): Promise<string | null> {
		if (!this.settings.apiUrl || !this.settings.authCode) {
			new Notice('请先配置 API URL 和认证码');
			return null;
		}

		try {
			const formData = new FormData();
			formData.append('file', file);

			const params = new URLSearchParams({
				authCode: this.settings.authCode,
				uploadChannel: this.settings.uploadChannel,
				uploadNameType: this.settings.uploadNameType,
				returnFormat: this.settings.returnFormat,
				serverCompress: this.settings.serverCompress.toString(),
				autoRetry: this.settings.autoRetry.toString()
			});

			if (this.settings.uploadFolder) {
				params.append('uploadFolder', this.settings.uploadFolder);
			}

			const response = await fetch(`${this.settings.apiUrl}/upload?${params}`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(`上传失败: ${response.status} ${response.statusText}`);
			}

			const result = await response.json();
			if (result && result[0] && result[0].src) {
				// 根据返回格式设置决定是否拼接URL
				if (this.settings.returnFormat === 'full') {
					// 完整链接格式，直接返回
					return result[0].src;
				} else {
					// 默认格式，需要拼接API URL
					const fullUrl = `${this.settings.apiUrl}${result[0].src}`;
					return fullUrl;
				}
			} else {
				throw new Error('服务器返回格式错误');
			}
		} catch (error) {
			console.error('图片上传失败:', error);
			new Notice(`图片上传失败: ${error.message}`);
			return null;
		}
	}
}
