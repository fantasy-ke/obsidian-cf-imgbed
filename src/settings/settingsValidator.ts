import { Notice } from 'obsidian';
import { CFImageBedSettings } from '../types';

export class SettingsValidator {
	static validateSettings(settings: CFImageBedSettings): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// 验证基础配置
		if (!settings.apiUrl) {
			errors.push('API URL 不能为空');
		} else if (!this.isValidUrl(settings.apiUrl)) {
			errors.push('API URL 格式不正确');
		}

		if (!settings.authCode) {
			errors.push('认证码不能为空');
		}

		// 验证文件大小
		if (settings.maxFileSize < 1 || settings.maxFileSize > 100) {
			errors.push('文件大小限制应在 1-100 MB 之间');
		}

		// 验证客户端压缩配置
		if (settings.enableClientCompress) {
			if (settings.compressThreshold < 0.1 || settings.compressThreshold > 20) {
				errors.push('压缩阈值应在 0.1-20 MB 之间');
			}
			
			if (settings.targetSize < 0.1 || settings.targetSize > 10) {
				errors.push('期望大小应在 0.1-10 MB 之间');
			}
			
			if (settings.targetSize >= settings.compressThreshold) {
				errors.push('期望大小应小于压缩阈值');
			}
		}

		// 验证通知持续时间
		if (settings.notificationDuration < 1 || settings.notificationDuration > 30) {
			errors.push('通知持续时间应在 1-30 秒之间');
		}

		// 验证文件类型
		if (settings.allowedFileTypes.length === 0) {
			errors.push('至少需要指定一种允许的文件类型');
		}

		// 验证水印设置
		if (settings.enableWatermark) {
			if (!settings.watermarkText.trim()) {
				errors.push('启用水印时必须设置水印文字');
			}
			
			if (settings.watermarkSize < 8 || settings.watermarkSize > 100) {
				errors.push('水印字体大小应在 8-100 像素之间');
			}
			
			if (settings.watermarkOpacity < 0.1 || settings.watermarkOpacity > 1) {
				errors.push('水印透明度应在 0.1-1 之间');
			}
		}

		// 验证备份路径
		if (settings.enableLocalBackup && !settings.backupPath.trim()) {
			errors.push('启用本地备份时必须设置备份路径');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	static validateFileType(fileName: string, allowedTypes: string[]): boolean {
		const extension = fileName.split('.').pop()?.toLowerCase();
		return extension ? allowedTypes.includes(extension) : false;
	}

	static validateFileSize(fileSize: number, maxSizeMB: number): boolean {
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		return fileSize <= maxSizeBytes;
	}

	static showValidationErrors(errors: string[]): void {
		if (errors.length > 0) {
			new Notice(`配置验证失败：\n${errors.join('\n')}`, 5000);
		}
	}

	static showValidationSuccess(): void {
		new Notice('配置验证通过', 2000);
	}
}
