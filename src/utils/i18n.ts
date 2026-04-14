export type Language = 'zh' | 'en';

export function resolveLanguage(language: string | null | undefined): Language {
	return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

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
		},
		notices: {
			uploadingRemoteImages: '正在上传网络图片...',
			openMarkdownFileFirst: '请先打开一个 Markdown 文件',
			allRemoteImagesExcluded: '当前文档中的网络图片都在排除域名列表中，已跳过',
			onlyRemoteImagesFound: '当前文档只有网络图片。开启“网络图片上传”后可一并上传。',
			noUploadableImages: '当前文档没有可上传的图片',
			uploadingCurrentNoteImages: '正在上传当前文档中的 {count} 张图片...',
			documentChangedSkipReplace: '文档内容已变化，本次未自动替换链接',
			checkFileSystemPermission: '请检查浏览器权限设置，允许访问文件系统',
			uploadingImage: '正在上传图片...',
			uploadSuccess: '图片上传成功：{url}',
			remoteUploadSummary: '网络图片上传完成：成功 {success}，失败 {failed}',
			remoteUploadFailedKeepOriginal: '网络图片上传失败，已保留原始内容',
			batchUploadSummary: '当前文档图片上传完成：成功 {success}，失败 {failed}{skippedText}',
			batchUploadFailed: '当前文档图片上传失败：成功 0，失败 {failed}{skippedText}',
			skippedText: '，跳过 {count}',
			uploadConfigRequired: '请先配置 API URL，并填写认证码或 API Token',
			unsupportedFileType: '不支持的文件类型: {type}',
			fileSizeExceeded: '文件大小超过限制: {size}',
			uploadFailed: '图片上传失败：{message}',
			watermarkFailedFallback: '水印添加失败，将上传原始文件'
		},
		errors: {
			serverResponseInvalid: '服务器返回格式错误',
			chunkSizeMustBePositive: '分块大小必须大于 0 才能启用分块上传',
			chunkInitMissingUploadId: '初始化分块上传失败：未获取到 uploadId',
			uploadHttpFailed: '上传失败，状态码：{status}',
			backupPathConflict: '备份路径冲突：{path} 已存在同名文件',
			canvasContextUnavailable: '无法创建画布上下文',
			watermarkApplyFailed: '水印添加失败'
		},
		validation: {
			apiUrlRequired: 'API URL 不能为空',
			apiUrlInvalid: 'API URL 格式不正确',
			authRequired: '认证码和 API Token 至少填写一项',
			chunkSizeOutOfRange: '分块大小应在 0-100 MB 之间',
			maxFileSizeOutOfRange: '文件大小限制应在 1-100 MB 之间',
			compressThresholdOutOfRange: '压缩阈值应在 0.1-20 MB 之间',
			targetSizeOutOfRange: '期望大小应在 0.1-10 MB 之间',
			targetSizeMustBeSmaller: '期望大小应小于压缩阈值',
			notificationDurationOutOfRange: '通知持续时间应在 1-30 秒之间',
			allowedFileTypesRequired: '至少需要指定一种允许的文件类型',
			channelNameInvalid: '渠道名称格式不正确',
			customPatternRequired: '自定义命名时必须设置文件名模板',
			watermarkTextRequired: '启用水印时必须设置水印文字',
			watermarkSizeOutOfRange: '水印字体大小应在 8-100 像素之间',
			watermarkOpacityOutOfRange: '水印透明度应在 0.1-1 之间',
			backupPathRequired: '启用本地备份时必须设置备份路径',
			validateFailed: '配置验证失败：\n{errors}',
			validateSuccess: '配置验证通过'
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
		},
		notices: {
			uploadingRemoteImages: 'Uploading remote images...',
			openMarkdownFileFirst: 'Please open a Markdown file first',
			allRemoteImagesExcluded: 'All remote images in this note are excluded and were skipped',
			onlyRemoteImagesFound: 'This note only contains remote images. Enable remote image upload to upload them.',
			noUploadableImages: 'No uploadable images found in the current note',
			uploadingCurrentNoteImages: 'Uploading {count} images from the current note...',
			documentChangedSkipReplace: 'The note content changed, so links were not replaced automatically',
			checkFileSystemPermission: 'Please check browser permissions and allow file system access',
			uploadingImage: 'Uploading image...',
			uploadSuccess: 'Image uploaded successfully: {url}',
			remoteUploadSummary: 'Remote image upload completed: {success} succeeded, {failed} failed',
			remoteUploadFailedKeepOriginal: 'Remote image upload failed and original content was kept',
			batchUploadSummary: 'Current note upload completed: {success} succeeded, {failed} failed{skippedText}',
			batchUploadFailed: 'Current note upload failed: 0 succeeded, {failed} failed{skippedText}',
			skippedText: ', {count} skipped',
			uploadConfigRequired: 'Please configure API URL and provide auth code or API token',
			unsupportedFileType: 'Unsupported file type: {type}',
			fileSizeExceeded: 'File size exceeds limit: {size}',
			uploadFailed: 'Image upload failed: {message}',
			watermarkFailedFallback: 'Watermark processing failed. Uploading the original file instead'
		},
		errors: {
			serverResponseInvalid: 'Invalid server response format',
			chunkSizeMustBePositive: 'Chunk size must be greater than 0 to enable chunked upload',
			chunkInitMissingUploadId: 'Chunked upload initialization failed: uploadId is missing',
			uploadHttpFailed: 'Upload failed with status code: {status}',
			backupPathConflict: 'Backup path conflict: {path} already exists as a file',
			canvasContextUnavailable: 'Failed to create canvas context',
			watermarkApplyFailed: 'Failed to apply watermark'
		},
		validation: {
			apiUrlRequired: 'API URL is required',
			apiUrlInvalid: 'API URL format is invalid',
			authRequired: 'Either auth code or API token is required',
			chunkSizeOutOfRange: 'Chunk size must be between 0 and 100 MB',
			maxFileSizeOutOfRange: 'Maximum file size must be between 1 and 100 MB',
			compressThresholdOutOfRange: 'Compression threshold must be between 0.1 and 20 MB',
			targetSizeOutOfRange: 'Target size must be between 0.1 and 10 MB',
			targetSizeMustBeSmaller: 'Target size must be smaller than compression threshold',
			notificationDurationOutOfRange: 'Notification duration must be between 1 and 30 seconds',
			allowedFileTypesRequired: 'At least one allowed file type is required',
			channelNameInvalid: 'Channel name format is invalid',
			customPatternRequired: 'Custom naming requires a file name template',
			watermarkTextRequired: 'Watermark text is required when watermark is enabled',
			watermarkSizeOutOfRange: 'Watermark font size must be between 8 and 100 pixels',
			watermarkOpacityOutOfRange: 'Watermark opacity must be between 0.1 and 1',
			backupPathRequired: 'Backup path is required when local backup is enabled',
			validateFailed: 'Settings validation failed:\n{errors}',
			validateSuccess: 'Settings validated successfully'
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

	private format(template: string, params?: Record<string, string | number>): string {
		if (!params) {
			return template;
		}

		return template.replace(/\{(\w+)\}/g, (match, key: string) => {
			const value = params[key];
			return value === undefined ? match : String(value);
		});
	}

	t(key: string, params?: Record<string, string | number>): string {
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

		return typeof value === 'string' ? this.format(value, params) : key;
	}
}

export const i18n = new I18n('zh');
