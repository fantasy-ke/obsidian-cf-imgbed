import { Notice } from 'obsidian';

export class ClientCompressor {
	/**
	 * 压缩图片文件
	 * @param file 原始图片文件
	 * @param targetSizeMB 目标大小（MB）
	 * @param thresholdMB 压缩阈值（MB）
	 * @returns 压缩后的文件或原始文件
	 */
	static async compressImage(
		file: File, 
		targetSizeMB: number, 
		thresholdMB: number
	): Promise<File> {
		// 检查文件大小是否超过阈值
		const fileSizeMB = file.size / (1024 * 1024);
		
		if (fileSizeMB <= thresholdMB) {
			console.debug(`CF ImageBed: File size ${fileSizeMB.toFixed(2)}MB does not exceed threshold ${thresholdMB}MB, skipping compression`);
			return file;
		}

		console.debug(`CF ImageBed: Starting image compression, original size: ${fileSizeMB.toFixed(2)}MB, target size: ${targetSizeMB}MB`);

		try {
			// 创建图片对象
			const img = new Image();
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				throw new Error('无法创建画布上下文');
			}

			// 等待图片加载
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = URL.createObjectURL(file);
			});

			// 计算压缩后的尺寸
			const { width, height } = this.calculateCompressedDimensions(
				img.width, 
				img.height, 
				targetSizeMB, 
				fileSizeMB
			);

			// 设置画布尺寸
			canvas.width = width;
			canvas.height = height;

			// 绘制压缩后的图片
			ctx.drawImage(img, 0, 0, width, height);

			// 转换为 Blob
			const compressedBlob = await new Promise<Blob>((resolve) => {
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob);
					} else {
						throw new Error('压缩失败');
					}
				}, 'image/jpeg', 0.8); // 使用 JPEG 格式，质量 0.8
			});

			// 创建新的文件对象
			const compressedFile = new File([compressedBlob], file.name, {
				type: 'image/jpeg',
				lastModified: Date.now()
			});

			const compressedSizeMB = compressedFile.size / (1024 * 1024);
			console.debug(`CF ImageBed: Compression complete, compressed size: ${compressedSizeMB.toFixed(2)}MB`);

			// 清理资源
			URL.revokeObjectURL(img.src);

			return compressedFile;

		} catch (error) {
			console.error('CF ImageBed: 图片压缩失败:', error);
			new Notice('图片压缩失败，将上传原始文件', 3000);
			return file;
		}
	}

	/**
	 * 计算压缩后的图片尺寸
	 * @param originalWidth 原始宽度
	 * @param originalHeight 原始高度
	 * @param targetSizeMB 目标大小（MB）
	 * @param originalSizeMB 原始大小（MB）
	 * @returns 压缩后的尺寸
	 */
	private static calculateCompressedDimensions(
		originalWidth: number,
		originalHeight: number,
		targetSizeMB: number,
		originalSizeMB: number
	): { width: number; height: number } {
		// 计算压缩比例（基于文件大小）
		const sizeRatio = Math.sqrt(targetSizeMB / originalSizeMB);
		
		// 计算新尺寸
		let newWidth = Math.floor(originalWidth * sizeRatio);
		let newHeight = Math.floor(originalHeight * sizeRatio);

		// 确保尺寸不会太小（最小 100px）
		const minSize = 100;
		if (newWidth < minSize || newHeight < minSize) {
			const aspectRatio = originalWidth / originalHeight;
			if (aspectRatio > 1) {
				newWidth = Math.max(minSize, newWidth);
				newHeight = Math.floor(newWidth / aspectRatio);
			} else {
				newHeight = Math.max(minSize, newHeight);
				newWidth = Math.floor(newHeight * aspectRatio);
			}
		}

		// 确保尺寸不会太大（最大 4000px）
		const maxSize = 4000;
		if (newWidth > maxSize || newHeight > maxSize) {
			const aspectRatio = originalWidth / originalHeight;
			if (aspectRatio > 1) {
				newWidth = Math.min(maxSize, newWidth);
				newHeight = Math.floor(newWidth / aspectRatio);
			} else {
				newHeight = Math.min(maxSize, newHeight);
				newWidth = Math.floor(newHeight * aspectRatio);
			}
		}

		return { width: newWidth, height: newHeight };
	}

	/**
	 * 检查文件类型是否支持压缩
	 * @param file 文件对象
	 * @returns 是否支持压缩
	 */
	static isCompressible(file: File): boolean {
		const compressibleTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		return compressibleTypes.includes(file.type.toLowerCase());
	}

	/**
	 * 获取文件大小描述
	 * @param bytes 字节数
	 * @returns 格式化的文件大小
	 */
	static formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}
