export interface CFImageBedSettings {
	// 基础配置
	apiUrl: string;
	authCode: string;
	uploadChannel: string;
	uploadNameType: string;
	returnFormat: string;
	uploadFolder: string;
	serverCompress: boolean;
	autoRetry: boolean;
	
	// 高级配置
	maxFileSize: number; // MB
	allowedFileTypes: string[];
	enableWatermark: boolean;
	watermarkText: string;
	watermarkPosition: string;
	watermarkSize: number; // 水印字体大小
	watermarkOpacity: number; // 水印透明度 0-1
	
	// 客户端压缩配置
	enableClientCompress: boolean;
	compressThreshold: number; // MB - 压缩阈值
	targetSize: number; // MB - 期望大小
	
	// 用户体验配置
	showUploadProgress: boolean;
	showSuccessNotification: boolean;
	showErrorNotification: boolean;
	notificationDuration: number; // 秒
	
	// 备份配置
	enableLocalBackup: boolean;
	backupPath: string;
}

export const DEFAULT_SETTINGS: CFImageBedSettings = {
	// 基础配置
	apiUrl: '',
	authCode: '',
	uploadChannel: 'telegram',
	uploadNameType: 'default',
	returnFormat: 'default',
	uploadFolder: '',
	serverCompress: true,
	autoRetry: true,
	
	// 高级配置
	maxFileSize: 10, // 10MB
	allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
	enableWatermark: false,
	watermarkText: '',
	watermarkPosition: 'bottom-right',
	watermarkSize: 24, // 字体大小
	watermarkOpacity: 0.7, // 透明度
	
	// 客户端压缩配置
	enableClientCompress: false,
	compressThreshold: 2, // 2MB
	targetSize: 1, // 1MB
	
	// 用户体验配置
	showUploadProgress: true,
	showSuccessNotification: true,
	showErrorNotification: true,
	notificationDuration: 5,
	
	// 备份配置
	enableLocalBackup: false,
	backupPath: 'attachments/backup',

};
