import { Notice, normalizePath, requestUrl, TFile, Vault } from 'obsidian';
import { CFImageBedSettings } from '../types';
import { ClientCompressor } from '../utils/clientCompressor';
import { ClientWatermark } from '../utils/clientWatermark';

export class UploadService {
	constructor(private settings: CFImageBedSettings) {}

	async uploadImage(
		file: File,
		options: { showErrorNotice?: boolean } = {}
	): Promise<string | null> {
		if (!this.settings.apiUrl || (!this.settings.authCode && !this.settings.apiToken)) {
			if (options.showErrorNotice !== false) {
				new Notice('请先配置 API URL，并填写认证码或 API Token');
			}
			return null;
		}

		try {
			// 检查文件类型
			if (!this.isAllowedFileType(file)) {
				if (options.showErrorNotice !== false) {
					new Notice(`不支持的文件类型: ${file.type}`);
				}
				return null;
			}

			// 检查文件大小
			if (!this.isFileSizeAllowed(file)) {
				if (options.showErrorNotice !== false) {
					new Notice(`文件大小超过限制: ${ClientCompressor.formatFileSize(file.size)}`);
				}
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

			const result = this.shouldUseChunkedUpload(processedFile)
				? await this.chunkedUpload(processedFile)
				: await this.simpleUpload(processedFile);

			const src = this.extractSrc(result);
			if (src) {
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
					return src;
				} else {
					// 默认格式，需要拼接API URL
					const fullUrl = `${this.settings.apiUrl}${src}`;
					return fullUrl;
				}
			} else {
				throw new Error('服务器返回格式错误');
			}
		} catch (error) {
			console.error('Image upload failed:', error);
			if (options.showErrorNotice !== false && this.settings.showErrorNotification) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				new Notice(`Image upload failed: ${errorMessage}`, (this.settings.notificationDuration ?? 5) * 1000);
			}
			return null;
		}
	}

	private shouldUseChunkedUpload(file: File): boolean {
		if (!['telegram', 'discord'].includes(this.settings.uploadChannel)) {
			return false;
		}

		const chunkSizeBytes = Math.max(1, this.settings.chunkSizeMB) * 1024 * 1024;
		return file.size > chunkSizeBytes;
	}

	private getUploadQueryParams(extraParams?: Record<string, string>): URLSearchParams {
		const params = new URLSearchParams({
			uploadChannel: this.settings.uploadChannel,
			uploadNameType: this.settings.uploadNameType,
			returnFormat: this.settings.returnFormat,
			autoRetry: this.settings.autoRetry.toString()
		});

		if (!this.settings.apiToken && this.settings.authCode) {
			params.append('authCode', this.settings.authCode);
		}

		if (this.settings.channelName?.trim()) {
			params.append('channelName', this.settings.channelName.trim());
		}

		if (this.settings.uploadFolder?.trim()) {
			params.append('uploadFolder', this.settings.uploadFolder.trim());
		}

		if (this.settings.uploadChannel === 'telegram') {
			params.append('serverCompress', this.settings.serverCompress.toString());
		}

		if (extraParams) {
			for (const [key, value] of Object.entries(extraParams)) {
				params.append(key, value);
			}
		}

		return params;
	}

	private getHeaders(boundary: string): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': `multipart/form-data; boundary=${boundary}`
		};

		if (this.settings.apiToken?.trim()) {
			headers.Authorization = `Bearer ${this.settings.apiToken.trim()}`;
		}

		return headers;
	}

	private async simpleUpload(file: File): Promise<unknown> {
		const params = this.getUploadQueryParams();
		return this.sendMultipartRequest(params, { file });
	}

	private async chunkedUpload(file: File): Promise<unknown> {
		const chunkSizeBytes = Math.max(1, this.settings.chunkSizeMB) * 1024 * 1024;
		const totalChunks = Math.ceil(file.size / chunkSizeBytes);
		const originalFileType = file.type || 'application/octet-stream';

		const initResult = await this.sendMultipartRequest(
			this.getUploadQueryParams({ initChunked: 'true' }),
			{
				totalChunks: String(totalChunks),
				originalFileName: file.name,
				originalFileType
			}
		);

		const uploadId = this.extractUploadId(initResult);
		if (!uploadId) {
			throw new Error('初始化分块上传失败：未获取到 uploadId');
		}

		for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
			const start = chunkIndex * chunkSizeBytes;
			const end = Math.min(file.size, start + chunkSizeBytes);
			const chunkBlob = file.slice(start, end, originalFileType);
			const chunkFile = new File([chunkBlob], file.name, { type: originalFileType });

			await this.sendMultipartRequest(
				this.getUploadQueryParams({ chunked: 'true' }),
				{
					uploadId,
					chunkIndex: String(chunkIndex),
					totalChunks: String(totalChunks),
					originalFileName: file.name,
					originalFileType,
					file: chunkFile
				}
			);
		}

		return this.sendMultipartRequest(
			this.getUploadQueryParams({ chunked: 'true', merge: 'true' }),
			{
				uploadId,
				totalChunks: String(totalChunks),
				originalFileName: file.name,
				originalFileType
			}
		);
	}

	private async sendMultipartRequest(
		params: URLSearchParams,
		fields: Record<string, string | File>
	): Promise<unknown> {
		const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
		const body = await this.buildMultipartBody(boundary, fields);
		const response = await requestUrl({
			url: `${this.settings.apiUrl}/upload?${params.toString()}`,
			method: 'POST',
			body: body.buffer,
			headers: this.getHeaders(boundary)
		});

		if (response.status !== 200) {
			throw new Error(`Upload failed: ${response.status}`);
		}

		return response.json;
	}

	private async buildMultipartBody(
		boundary: string,
		fields: Record<string, string | File>
	): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const parts: Uint8Array[] = [];
		let totalLength = 0;

		for (const [name, value] of Object.entries(fields)) {
			if (value instanceof File) {
				const header = encoder.encode(
					`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="${name}"; filename="${value.name}"\r\n` +
					`Content-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`
				);
				const content = new Uint8Array(await value.arrayBuffer());
				const footer = encoder.encode('\r\n');

				parts.push(header, content, footer);
				totalLength += header.length + content.length + footer.length;
			} else {
				const field = encoder.encode(
					`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="${name}"\r\n\r\n` +
					`${value}\r\n`
				);
				parts.push(field);
				totalLength += field.length;
			}
		}

		const ending = encoder.encode(`--${boundary}--\r\n`);
		parts.push(ending);
		totalLength += ending.length;

		const body = new Uint8Array(totalLength);
		let offset = 0;
		for (const part of parts) {
			body.set(part, offset);
			offset += part.length;
		}

		return body;
	}

	private extractSrc(result: unknown): string | null {
		if (Array.isArray(result) && result[0] && typeof result[0] === 'object' && 'src' in result[0]) {
			return String((result[0] as { src?: string }).src || '');
		}

		if (result && typeof result === 'object') {
			if ('src' in result) {
				return String((result as { src?: string }).src || '');
			}

			if ('data' in result && Array.isArray((result as { data?: unknown[] }).data)) {
				const first = (result as { data?: Array<{ src?: string }> }).data?.[0];
				return first?.src || null;
			}
		}

		return null;
	}

	private extractUploadId(result: unknown): string | null {
		if (result && typeof result === 'object' && 'uploadId' in result) {
			return String((result as { uploadId?: string }).uploadId || '');
		}

		return null;
	}

	private async saveLocalBackup(file: File, backupPath: string): Promise<void> {
		// Obsidian 的 app 对象在此不可直接访问；通过 window.app 使用
		const app = (window as { app?: { vault?: Vault } }).app;
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
		if (existing && existing instanceof TFile) {
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
