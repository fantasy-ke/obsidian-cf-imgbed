export interface CFImageBedSettings {
	apiUrl: string;
	authCode: string;
	uploadChannel: string;
	uploadNameType: string;
	returnFormat: string;
	uploadFolder: string;
	serverCompress: boolean;
	autoRetry: boolean;
}

export const DEFAULT_SETTINGS: CFImageBedSettings = {
	apiUrl: '',
	authCode: '',
	uploadChannel: 'telegram',
	uploadNameType: 'default',
	returnFormat: 'default',
	uploadFolder: '',
	serverCompress: true,
	autoRetry: true
};
