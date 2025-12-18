export type Language = 'zh' | 'en';

export interface Translations {
	[key: string]: string | Translations;
}

const translations: Record<Language, Translations> = {
	zh: {
		settings: {
			title: 'CF ImageBed 设置',
			tabs: {
				basic: '基础设置',
				advanced: '高级设置',
				userExperience: '用户体验',
				backup: '备份设置'
			},
			basic: {
				apiUrl: {
					name: 'API URL',
					desc: 'CloudFlare ImgBed 的 API 地址（例如：https://your.domain）'
				},
				authCode: {
					name: '认证码',
					desc: '上传认证码'
				},
				uploadChannel: {
					name: '上传渠道',
					desc: '选择上传渠道'
				},
				uploadNameType: {
					name: '文件命名方式',
					desc: '选择文件命名方式'
				},
				returnFormat: {
					name: '返回链接格式',
					desc: '选择返回链接格式'
				},
				uploadFolder: {
					name: '上传目录',
					desc: '上传目录，用相对路径表示（例如：img/test）'
				},
				serverCompress: {
					name: '服务端压缩',
					desc: '启用服务端压缩（仅针对 Telegram 渠道的图片文件）'
				},
				autoRetry: {
					name: '自动重试',
					desc: '失败时自动切换渠道重试'
				}
			},
			advanced: {
				maxFileSize: {
					name: '最大文件大小',
					desc: '设置上传文件的最大大小（MB）'
				},
				allowedFileTypes: {
					name: '允许的文件类型',
					desc: '设置允许上传的文件类型（用逗号分隔）'
				},
				enableWatermark: {
					name: '启用水印',
					desc: '为上传的图片添加水印'
				},
				watermarkText: {
					name: '水印文字',
					desc: '设置水印文字内容'
				},
				watermarkPosition: {
					name: '水印位置',
					desc: '设置水印在图片中的位置'
				},
				watermarkSize: {
					name: '水印字体大小',
					desc: '设置水印文字的字体大小（像素）'
				},
				watermarkOpacity: {
					name: '水印透明度',
					desc: '设置水印的透明度（0-1）'
				},
				enableClientCompress: {
					name: '启用客户端压缩',
					desc: '在上传前自动压缩图片以减少文件大小'
				},
				compressThreshold: {
					name: '压缩阈值',
					desc: '设置图片大小阈值，超过此值将自动压缩（MB）'
				},
				targetSize: {
					name: '期望大小',
					desc: '设置压缩后图片大小期望值（MB）'
				}
			},
			userExperience: {
				showUploadProgress: {
					name: '显示上传提示',
					desc: '在上传过程中显示提示信息'
				},
				showSuccessNotification: {
					name: '显示成功通知',
					desc: '上传成功后显示通知消息'
				},
				showErrorNotification: {
					name: '显示错误通知',
					desc: '上传失败时显示错误消息'
				},
				notificationDuration: {
					name: '通知持续时间',
					desc: '设置通知消息显示的持续时间（秒）'
				}
			},
			backup: {
				enableLocalBackup: {
					name: '启用本地备份',
					desc: '在上传到云端的同时，在本地保存一份备份'
				},
				backupPath: {
					name: '备份路径',
					desc: '设置本地备份的存储路径（相对于库根目录）'
				}
			},
			language: {
				name: '语言设置',
				desc: '选择界面显示语言'
			}
		},
		menu: {
			uploadImage: '上传图片到 CF ImageBed'
		},
		mobile: {
			selectSource: '选择图片来源',
			takePhoto: '📷 拍照',
			selectFromGallery: '🖼️ 从相册选择',
			cancel: '取消'
		}
	},
	en: {
		settings: {
			title: 'CF ImageBed settings',
			tabs: {
				basic: 'Basic settings',
				advanced: 'Advanced settings',
				userExperience: 'User experience',
				backup: 'Backup settings'
			},
			basic: {
				apiUrl: {
					name: 'API URL',
					desc: 'CloudFlare ImgBed API address (e.g., https://your.domain)'
				},
				authCode: {
					name: 'Auth code',
					desc: 'Upload authentication code'
				},
				uploadChannel: {
					name: 'Upload channel',
					desc: 'Select upload channel'
				},
				uploadNameType: {
					name: 'File naming method',
					desc: 'Select file naming method'
				},
				returnFormat: {
					name: 'Return link format',
					desc: 'Select return link format'
				},
				uploadFolder: {
					name: 'Upload folder',
					desc: 'Upload folder, use relative path (e.g., img/test)'
				},
				serverCompress: {
					name: 'Server compression',
					desc: 'Enable server-side compression (only for Telegram channel image files)'
				},
				autoRetry: {
					name: 'Auto retry',
					desc: 'Automatically switch channels and retry on failure'
				}
			},
			advanced: {
				maxFileSize: {
					name: 'Maximum file size',
					desc: 'Set maximum size for uploaded files (MB)'
				},
				allowedFileTypes: {
					name: 'Allowed file types',
					desc: 'Set allowed file types for upload (comma-separated)'
				},
				enableWatermark: {
					name: 'Enable watermark',
					desc: 'Add watermark to uploaded images'
				},
				watermarkText: {
					name: 'Watermark text',
					desc: 'Set watermark text content'
				},
				watermarkPosition: {
					name: 'Watermark position',
					desc: 'Set watermark position in image'
				},
				watermarkSize: {
					name: 'Watermark font size',
					desc: 'Set watermark text font size (pixels)'
				},
				watermarkOpacity: {
					name: 'Watermark opacity',
					desc: 'Set watermark opacity (0-1)'
				},
				enableClientCompress: {
					name: 'Enable client compression',
					desc: 'Automatically compress images before upload to reduce file size'
				},
				compressThreshold: {
					name: 'Compression threshold',
					desc: 'Set image size threshold, files exceeding this will be automatically compressed (MB)'
				},
				targetSize: {
					name: 'Target size',
					desc: 'Set expected size for compressed images (MB)'
				}
			},
			userExperience: {
				showUploadProgress: {
					name: 'Show upload progress',
					desc: 'Show progress information during upload'
				},
				showSuccessNotification: {
					name: 'Show success notification',
					desc: 'Show notification message on successful upload'
				},
				showErrorNotification: {
					name: 'Show error notification',
					desc: 'Show error message when upload fails'
				},
				notificationDuration: {
					name: 'Notification duration',
					desc: 'Set duration for notification display (seconds)'
				}
			},
			backup: {
				enableLocalBackup: {
					name: 'Enable local backup',
					desc: 'Save a local backup while uploading to cloud'
				},
				backupPath: {
					name: 'Backup path',
					desc: 'Set local backup storage path (relative to vault root)'
				}
			},
			language: {
				name: 'Language',
				desc: 'Select interface display language'
			}
		},
		menu: {
			uploadImage: 'Upload image to CF ImageBed'
		},
		mobile: {
			selectSource: 'Select image source',
			takePhoto: '📷 Take photo',
			selectFromGallery: '🖼️ Select from gallery',
			cancel: 'Cancel'
		}
	}
};

export class I18n {
	private currentLanguage: Language;

	constructor(language: Language = 'zh') {
		this.currentLanguage = language;
	}

	setLanguage(language: Language): void {
		this.currentLanguage = language;
	}

	getLanguage(): Language {
		return this.currentLanguage;
	}

	t(key: string): string {
		const keys = key.split('.');
		let value: any = translations[this.currentLanguage];

		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = value[k];
			} else {
				// Fallback to English if key not found
				value = translations.en;
				for (const k2 of keys) {
					if (value && typeof value === 'object' && k2 in value) {
						value = value[k2];
					} else {
						return key; // Return key if translation not found
					}
				}
				break;
			}
		}

		return typeof value === 'string' ? value : key;
	}
}

export const i18n = new I18n('zh');

