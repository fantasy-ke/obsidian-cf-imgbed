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
					desc: 'CloudFlare ImgBed 的 API 地址（例如：https://your.domain）',
					placeholder: 'https://your.domain'
				},
				authCode: {
					name: '认证码',
					desc: '上传认证码（未填写 API Token 时必填）',
					placeholder: 'your_authCode'
				},
				apiToken: {
					name: 'API Token',
					desc: 'API Token 认证（需要 upload 权限，优先于认证码）',
					placeholder: 'your_api_token'
				},
				uploadChannel: {
					name: '上传渠道',
					desc: '选择上传渠道',
					options: {
						telegram: 'Telegram',
						cfr2: 'Cloudflare R2',
						s3: 'S3 兼容存储',
						discord: 'Discord',
						huggingface: 'HuggingFace'
					}
				},
				channelName: {
					name: '渠道名称',
					desc: '指定具体的渠道实例，适用于多渠道场景',
					placeholder: '例如：my-channel'
				},
				chunkSizeMB: {
					name: '分块大小（MB）',
					desc: '0 表示关闭分块上传。Telegram 默认 16MB，Discord 默认 8MB，其他默认 0'
				},
				uploadNameType: {
					name: '文件命名方式',
					desc: '选择文件命名方式；自定义模式会先按占位符重命名，再以原文件名方式上传',
					options: {
						default: '默认前缀_原名命名',
						index: '仅前缀命名',
						origin: '仅原名命名',
						short: '短链接命名法',
						custom: '自定义占位符命名'
					}
				},
				customUploadNamePattern: {
					name: '自定义文件名模板',
					desc: '仅在自定义命名时生效',
					placeholder: '${noteFileName}-${datetime}-${originalAttachmentFileName}'
				},
				returnFormat: {
					name: '返回链接格式',
					desc: '选择返回链接格式',
					options: {
						default: '默认格式 /file/id',
						full: '完整链接格式'
					}
				},
				uploadFolder: {
					name: '上传目录',
					desc: '上传目录，使用相对路径',
					placeholder: '${noteFolderName}/${noteFileName}'
				},
				serverCompress: {
					name: '服务端压缩',
					desc: '仅 Telegram 渠道可修改，默认关闭'
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
					desc: '设置允许上传的文件类型（用逗号分隔）',
					placeholder: 'jpg,jpeg,png,gif,webp,bmp'
				},
				enableWatermark: {
					name: '启用水印',
					desc: '为上传的图片添加水印'
				},
				watermarkText: {
					name: '水印文字',
					desc: '设置水印文字内容',
					placeholder: '水印文字'
				},
				watermarkPosition: {
					name: '水印位置',
					desc: '设置水印在图片中的位置',
					options: {
						topLeft: '左上角',
						topRight: '右上角',
						bottomLeft: '左下角',
						bottomRight: '右下角',
						center: '居中'
					}
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
				},
				enableNetworkImageUpload: {
					name: '启用网络图片上传',
					desc: '开启后，粘贴外链图片或执行“上传当前文档所有图片”命令时，会先抓取外链并上传到自己的图床；失败时保持原链接'
				},
				excludedImageDomains: {
					name: '网络图片排除域名',
					desc: '这些域名的图片链接不会重复上传，支持逗号或换行分隔。当前 API URL 域名会自动加入排除列表',
					placeholder: 'example.com, cdn.example.com'
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
					desc: '相对于库根目录',
					placeholder: 'backup/${noteFolderName}/${noteFileName}'
				}
			},
			templates: {
				hint: '支持占位符，详见 README'
			},
			language: {
				name: '语言设置',
				desc: '选择界面显示语言'
			}
		},
		commands: {
			uploadImageMobile: '📷 拍照或相册选择',
			uploadCurrentNoteImages: '上传当前文档所有图片到 CF ImageBed'
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
					desc: 'CloudFlare ImgBed API address (e.g., https://your.domain)',
					placeholder: 'https://your.domain'
				},
				authCode: {
					name: 'Auth code',
					desc: 'Upload authentication code (required when API token is empty)',
					placeholder: 'Your auth code'
				},
				apiToken: {
					name: 'API token',
					desc: 'API token authentication (requires upload permission and takes precedence over auth code)',
					placeholder: 'Your API token'
				},
				uploadChannel: {
					name: 'Upload channel',
					desc: 'Select an upload channel',
					options: {
						telegram: 'Telegram',
						cfr2: 'Cloudflare R2',
						s3: 'S3 compatible storage',
						discord: 'Discord',
						huggingface: 'HuggingFace'
					}
				},
				channelName: {
					name: 'Channel name',
					desc: 'Specify a concrete channel instance for multi-channel deployments',
					placeholder: 'e.g. my-channel'
				},
				chunkSizeMB: {
					name: 'Chunk size (MB)',
					desc: '0 disables chunked upload. Telegram defaults to 16MB, Discord to 8MB, others to 0'
				},
				uploadNameType: {
					name: 'File naming method',
					desc: 'Select a file naming method. Custom mode renames the file with placeholders first, then uploads it using the original-name mode',
					options: {
						default: 'Default prefix_original name',
						index: 'Prefix only',
						origin: 'Original name only',
						short: 'Short link',
						custom: 'Custom placeholder name'
					}
				},
				customUploadNamePattern: {
					name: 'Custom file name template',
					desc: 'Used only in custom naming mode',
					placeholder: '${noteFileName}-${datetime}-${originalAttachmentFileName}'
				},
				returnFormat: {
					name: 'Return link format',
					desc: 'Select return link format',
					options: {
						default: 'Default format /file/id',
						full: 'Full link format'
					}
				},
				uploadFolder: {
					name: 'Upload folder',
					desc: 'Upload folder using a relative path',
					placeholder: '${noteFolderName}/${noteFileName}'
				},
				serverCompress: {
					name: 'Server compression',
					desc: 'Only editable for the Telegram channel and disabled by default'
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
					desc: 'Set allowed file types for upload (comma-separated)',
					placeholder: 'jpg,jpeg,png,gif,webp,bmp'
				},
				enableWatermark: {
					name: 'Enable watermark',
					desc: 'Add watermark to uploaded images'
				},
				watermarkText: {
					name: 'Watermark text',
					desc: 'Set watermark text content',
					placeholder: 'Watermark text'
				},
				watermarkPosition: {
					name: 'Watermark position',
					desc: 'Set watermark position in image',
					options: {
						topLeft: 'Top left',
						topRight: 'Top right',
						bottomLeft: 'Bottom left',
						bottomRight: 'Bottom right',
						center: 'Center'
					}
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
				},
				enableNetworkImageUpload: {
					name: 'Enable remote image upload',
					desc: 'When enabled, pasted remote image links and the “upload current note images” command will fetch remote images and upload them to your image bed. Failed uploads keep the original link.'
				},
				excludedImageDomains: {
					name: 'Excluded remote domains',
					desc: 'Images from these domains will not be uploaded again. Separate domains with commas or new lines. The current API URL domain is always excluded automatically.',
					placeholder: 'example.com, cdn.example.com'
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
					desc: 'Relative to the vault root',
					placeholder: 'backup/${noteFolderName}/${noteFileName}'
				}
			},
			templates: {
				hint: 'Placeholders supported. See README for details'
			},
			language: {
				name: 'Language',
				desc: 'Select interface display language'
			}
		},
		commands: {
			uploadImageMobile: '📷 Take photo or choose from gallery',
			uploadCurrentNoteImages: 'Upload current note images to CF ImageBed'
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
		let value: Translations | string = translations[this.currentLanguage];

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
