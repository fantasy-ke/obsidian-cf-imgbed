import { Notice, getLanguage } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { I18n, resolveLanguage } from '../utils/i18n';

export class SettingsValidator {
	private static i18n = new I18n(resolveLanguage(getLanguage()));

	static validateSettings(settings: CFImageBedSettings): { isValid: boolean; errors: string[] } {
		this.i18n.setLanguage(settings.language || resolveLanguage(getLanguage()));
		const errors: string[] = [];

		// 验证基础配置
		if (!settings.apiUrl) {
			errors.push(this.i18n.t('validation.apiUrlRequired'));
		} else if (!this.isValidUrl(settings.apiUrl)) {
			errors.push(this.i18n.t('validation.apiUrlInvalid'));
		}

		if (!settings.authCode && !settings.apiToken) {
			errors.push(this.i18n.t('validation.authRequired'));
		}

		if (settings.chunkSizeMB < 0 || settings.chunkSizeMB > 100) {
			errors.push(this.i18n.t('validation.chunkSizeOutOfRange'));
		}

		// 验证文件大小
		if (settings.maxFileSize < 1 || settings.maxFileSize > 100) {
			errors.push(this.i18n.t('validation.maxFileSizeOutOfRange'));
		}

		// 验证客户端压缩配置
		if (settings.enableClientCompress) {
			if (settings.compressThreshold < 0.1 || settings.compressThreshold > 20) {
				errors.push(this.i18n.t('validation.compressThresholdOutOfRange'));
			}
			
			if (settings.targetSize < 0.1 || settings.targetSize > 10) {
				errors.push(this.i18n.t('validation.targetSizeOutOfRange'));
			}
			
			if (settings.targetSize >= settings.compressThreshold) {
				errors.push(this.i18n.t('validation.targetSizeMustBeSmaller'));
			}
		}

		// 验证通知持续时间
		if (settings.notificationDuration < 1 || settings.notificationDuration > 30) {
			errors.push(this.i18n.t('validation.notificationDurationOutOfRange'));
		}

		// 验证文件类型
		if (settings.allowedFileTypes.length === 0) {
			errors.push(this.i18n.t('validation.allowedFileTypesRequired'));
		}

		if (settings.channelName.trim() && /(^\/|\\|\.\.)/.test(settings.channelName.trim())) {
			errors.push(this.i18n.t('validation.channelNameInvalid'));
		}

		if (settings.uploadNameType === 'custom' && !settings.customUploadNamePattern.trim()) {
			errors.push(this.i18n.t('validation.customPatternRequired'));
		}

		// 验证水印设置
		if (settings.enableWatermark) {
			if (!settings.watermarkText.trim()) {
				errors.push(this.i18n.t('validation.watermarkTextRequired'));
			}
			
			if (settings.watermarkSize < 8 || settings.watermarkSize > 100) {
				errors.push(this.i18n.t('validation.watermarkSizeOutOfRange'));
			}
			
			if (settings.watermarkOpacity < 0.1 || settings.watermarkOpacity > 1) {
				errors.push(this.i18n.t('validation.watermarkOpacityOutOfRange'));
			}
		}

		// 验证备份路径
		if (settings.enableLocalBackup && !settings.backupPath.trim()) {
			errors.push(this.i18n.t('validation.backupPathRequired'));
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
		this.i18n.setLanguage(resolveLanguage(getLanguage()));
		if (errors.length > 0) {
			new Notice(this.i18n.t('validation.validateFailed', { errors: errors.join('\n') }), 5000);
		}
	}

	static showValidationSuccess(): void {
		this.i18n.setLanguage(resolveLanguage(getLanguage()));
		new Notice(this.i18n.t('validation.validateSuccess'), 2000);
	}
}
