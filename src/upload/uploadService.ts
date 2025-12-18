import { Notice, normalizePath, requestUrl } from 'obsidian';
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
				console.debug('CF ImageBed: Starting watermark addition');
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
				console.debug('CF ImageBed: Starting client compression');
				processedFile = await ClientCompressor.compressImage(
					processedFile, 
					this.settings.targetSize, 
					this.settings.compressThreshold
				);
				
				// 显示压缩结果
				const originalSize = ClientCompressor.formatFileSize(file.size);
				const processedSize = ClientCompressor.formatFileSize(processedFile.size);
				console.debug(`CF ImageBed: Processing complete - Original: ${originalSize}, Processed: ${processedSize}`);
			}

			// 创建上传参数
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

			// 构造 multipart/form-data 请求体
			const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
			const fileArrayBuffer = await processedFile.arrayBuffer();
			const fileBytes = new Uint8Array(fileArrayBuffer);
			
			// 构建 multipart body
			const parts: (string | Uint8Array)[] = [];
			
			// 文件部分
			parts.push(`--${boundary}\r\n`);
			parts.push(`Content-Disposition: form-data; name="file"; filename="${processedFile.name}"\r\n`);
			parts.push(`Content-Type: ${processedFile.type}\r\n\r\n`);
			parts.push(fileBytes);
			parts.push(`\r\n--${boundary}--\r\n`);
			
			// 合并所有部分
			const bodyParts: Uint8Array[] = [];
			let totalLength = 0;
			
			for (const part of parts) {
				if (typeof part === 'string') {
					const encoder = new TextEncoder();
					const encoded = encoder.encode(part);
					bodyParts.push(encoded);
					totalLength += encoded.length;
				} else {
					bodyParts.push(part);
					totalLength += part.length;
				}
			}
			
			// 合并为单个 Uint8Array
			const body = new Uint8Array(totalLength);
			let offset = 0;
			for (const part of bodyParts) {
				body.set(part, offset);
				offset += part.length;
			}

			// 上传文件
			const response = await requestUrl({
				url: `${this.settings.apiUrl}/upload?${params}`,
				method: 'POST',
				body: body.buffer,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`
				}
			});

			if (response.status !== 200) {
				throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
			}

			const result = response.json;
			if (result && result[0] && result[0].src) {
				// 可选：本地备份
				if (this.settings.enableLocalBackup && this.settings.backupPath?.trim()) {
					try {
						await this.saveLocalBackup(processedFile, this.settings.backupPath);
				} catch (e) {
					console.warn('Local backup failed:', e);
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
			console.error('Image upload failed:', error);
			if (this.settings.showErrorNotification) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				new Notice(`Image upload failed: ${errorMessage}`, (this.settings.notificationDuration ?? 5) * 1000);
			}
			return null;
		}
	}

	private async saveLocalBackup(file: File, backupPath: string): Promise<void> {
		// Obsidian 的 app 对象在此不可直接访问；通过 window.app 使用
		const app = (window as { app?: { vault?: { createFolder: (path: string) => Promise<void>; getAbstractFileByPath: (path: string) => { modifyBinary: (file: { path: string }, data: ArrayBuffer) => Promise<void> } | null; createBinary: (path: string, data: ArrayBuffer) => Promise<void> } } }).app;
		if (!app?.vault) throw new Error('Cannot access Obsidian vault');
		const normalized = normalizePath(backupPath);
		const arrayBuffer = await file.arrayBuffer();
		// 确保文件夹存在
		try {
			await app.vault.createFolder(normalized);
		} catch {
			// Folder may already exist, ignore error
		}
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
