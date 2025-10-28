import { Notice, TFolder, normalizePath } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { ClientCompressor } from '../utils/clientCompressor';
import { ClientWatermark } from '../utils/clientWatermark';

export class UploadService {
	constructor(private settings: CFImageBedSettings) {}

	async uploadImage(file: File): Promise<string | null> {
		if (!this.settings.apiUrl || !this.settings.authCode) {
			new Notice('请先配置 API URL 和认证码');
			return null;
		}

		try {
			// 检查文件类型
			if (!this.isAllowedFileType(file)) {
				new Notice(`不支持的文件类型: ${file.type}`);
				return null;
			}

			// 检查文件大小
			if (!this.isFileSizeAllowed(file)) {
				new Notice(`文件大小超过限制: ${ClientCompressor.formatFileSize(file.size)}`);
				return null;
			}

			// 客户端处理（水印 + 压缩）
			let processedFile = file;
			
			// 1. 添加水印
			if (this.settings.enableWatermark && ClientWatermark.isWatermarkable(file)) {
				console.log('CF ImageBed: 开始添加水印');
				processedFile = await ClientWatermark.addWatermark(
					processedFile,
					this.settings.watermarkText,
					this.settings.watermarkPosition,
					this.settings.watermarkSize,
					this.settings.watermarkOpacity
				);
			}
			
			// 2. 客户端压缩
			if (this.settings.enableClientCompress && ClientCompressor.isCompressible(processedFile)) {
				console.log('CF ImageBed: 开始客户端压缩处理');
				processedFile = await ClientCompressor.compressImage(
					processedFile, 
					this.settings.targetSize, 
					this.settings.compressThreshold
				);
				
				// 显示压缩结果
				const originalSize = ClientCompressor.formatFileSize(file.size);
				const processedSize = ClientCompressor.formatFileSize(processedFile.size);
				console.log(`CF ImageBed: 处理完成 - 原始: ${originalSize}, 处理后: ${processedSize}`);
			}

			// 创建上传参数
			const formData = new FormData();
			formData.append('file', processedFile);

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

			// 上传文件
			const response = await fetch(`${this.settings.apiUrl}/upload?${params}`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(`上传失败: ${response.status} ${response.statusText}`);
			}

			const result = await response.json();
			if (result && result[0] && result[0].src) {
				// 可选：本地备份
				if (this.settings.enableLocalBackup && this.settings.backupPath?.trim()) {
					try {
						await this.saveLocalBackup(processedFile, this.settings.backupPath);
					} catch (e) {
						console.warn('本地备份失败:', e);
					}
				}
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
			if (this.settings.showErrorNotification) {
				new Notice(`图片上传失败: ${error.message}`, (this.settings.notificationDuration ?? 5) * 1000);
			}
			return null;
		}
	}

	private async saveLocalBackup(file: File, backupPath: string): Promise<void> {
		// Obsidian 的 app 对象在此不可直接访问；通过 window.app 使用
		const app: any = (window as any).app;
		if (!app?.vault) throw new Error('无法访问 Obsidian vault');
		const normalized = normalizePath(backupPath);
		const arrayBuffer = await file.arrayBuffer();
		// 确保文件夹存在
		try {
			await app.vault.createFolder(normalized);
		} catch {}
		const targetFilePath = normalizePath(`${normalized}/${file.name}`);
		// 如果存在则覆盖
		const existing = app.vault.getAbstractFileByPath(targetFilePath);
		if (existing) {
			await app.vault.modifyBinary(existing, arrayBuffer);
		} else {
			await app.vault.createBinary(targetFilePath, arrayBuffer);
		}
	}

	/**
	 * 检查文件类型是否允许
	 */
	private isAllowedFileType(file: File): boolean {
		const extension = file.name.split('.').pop()?.toLowerCase();
		return extension ? this.settings.allowedFileTypes.includes(extension) : false;
	}

	/**
	 * 检查文件大小是否允许
	 */
	private isFileSizeAllowed(file: File): boolean {
		const maxSizeBytes = this.settings.maxFileSize * 1024 * 1024;
		return file.size <= maxSizeBytes;
	}
}
