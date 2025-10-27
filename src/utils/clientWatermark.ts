import { Notice } from 'obsidian';

export class ClientWatermark {
	/**
	 * 为图片添加水印
	 * @param file 原始图片文件
	 * @param watermarkText 水印文字
	 * @param position 水印位置
	 * @param fontSize 字体大小
	 * @param opacity 透明度
	 * @returns 带水印的图片文件
	 */
	static async addWatermark(
		file: File,
		watermarkText: string,
		position: string,
		fontSize: number,
		opacity: number
	): Promise<File> {
		if (!watermarkText.trim()) {
			console.log('CF ImageBed: 水印文字为空，跳过水印处理');
			return file;
		}

		console.log(`CF ImageBed: 开始添加水印 - 文字: ${watermarkText}, 位置: ${position}`);

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

			// 设置画布尺寸
			canvas.width = img.width;
			canvas.height = img.height;

			// 绘制原始图片
			ctx.drawImage(img, 0, 0);

			// 设置水印样式
			ctx.font = `bold ${fontSize}px Arial, sans-serif`;
			ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
			ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
			ctx.lineWidth = 2;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			// 计算水印位置
			const positionData = this.calculateWatermarkPosition(
				img.width,
				img.height,
				position,
				fontSize,
				watermarkText
			);

			// 绘制水印文字（带描边效果）
			ctx.strokeText(watermarkText, positionData.x, positionData.y);
			ctx.fillText(watermarkText, positionData.x, positionData.y);

			// 转换为 Blob
			const watermarkedBlob = await new Promise<Blob>((resolve) => {
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob);
					} else {
						throw new Error('水印添加失败');
					}
				}, file.type, 0.9);
			});

			// 创建新的文件对象
			const watermarkedFile = new File([watermarkedBlob], file.name, {
				type: file.type,
				lastModified: Date.now()
			});

			console.log('CF ImageBed: 水印添加完成');

			// 清理资源
			URL.revokeObjectURL(img.src);

			return watermarkedFile;

		} catch (error) {
			console.error('CF ImageBed: 水印添加失败:', error);
			new Notice('水印添加失败，将上传原始文件', 3000);
			return file;
		}
	}

	/**
	 * 计算水印位置
	 * @param imgWidth 图片宽度
	 * @param imgHeight 图片高度
	 * @param position 位置字符串
	 * @param fontSize 字体大小
	 * @param text 水印文字
	 * @returns 水印位置坐标
	 */
	private static calculateWatermarkPosition(
		imgWidth: number,
		imgHeight: number,
		position: string,
		fontSize: number,
		text: string
	): { x: number; y: number } {
		const padding = fontSize; // 边距
		const textWidth = text.length * fontSize * 0.6; // 估算文字宽度
		const textHeight = fontSize;

		let x: number, y: number;

		switch (position) {
			case 'top-left':
				x = padding + textWidth / 2;
				y = padding + textHeight / 2;
				break;
			case 'top-right':
				x = imgWidth - padding - textWidth / 2;
				y = padding + textHeight / 2;
				break;
			case 'bottom-left':
				x = padding + textWidth / 2;
				y = imgHeight - padding - textHeight / 2;
				break;
			case 'bottom-right':
				x = imgWidth - padding - textWidth / 2;
				y = imgHeight - padding - textHeight / 2;
				break;
			case 'center':
				x = imgWidth / 2;
				y = imgHeight / 2;
				break;
			default:
				// 默认右下角
				x = imgWidth - padding - textWidth / 2;
				y = imgHeight - padding - textHeight / 2;
		}

		return { x, y };
	}

	/**
	 * 检查是否支持添加水印
	 * @param file 文件对象
	 * @returns 是否支持水印
	 */
	static isWatermarkable(file: File): boolean {
		const watermarkableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		return watermarkableTypes.includes(file.type.toLowerCase());
	}

	/**
	 * 获取水印位置选项
	 * @returns 位置选项数组
	 */
	static getPositionOptions(): Array<{ value: string; label: string }> {
		return [
			{ value: 'top-left', label: '左上角' },
			{ value: 'top-right', label: '右上角' },
			{ value: 'bottom-left', label: '左下角' },
			{ value: 'bottom-right', label: '右下角' },
			{ value: 'center', label: '居中' }
		];
	}
}
