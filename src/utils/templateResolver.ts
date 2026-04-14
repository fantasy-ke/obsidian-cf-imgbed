import { TFile, moment } from 'obsidian';

export interface TemplateContext {
	noteFile: TFile | null;
	originalFile: File;
}

const TOKEN_REGEX = /\$\{([a-zA-Z0-9]+)(?::(\{[^}]*\}))?\}/g;

export function resolveTemplate(template: string, context: TemplateContext): string {
	if (!template.trim()) {
		return '';
	}

	return template.replace(TOKEN_REGEX, (_match, rawTokenName: string, rawFormat?: string) => {
		const tokenName = rawTokenName.toLowerCase();
		const format = rawFormat ?? '';

		switch (tokenName) {
			case 'notefilename':
				return applyStringFormat(context.noteFile?.basename ?? '', format);
			case 'notefilepath':
				return context.noteFile?.path ?? '';
			case 'notefoldername':
				return applyStringFormat(context.noteFile?.parent?.name ?? '', format);
			case 'notefolderpath':
				return context.noteFile?.parent?.path ?? '';
			case 'originalattachmentfilename':
				return applyStringFormat(getBaseName(context.originalFile.name), format);
			case 'originalattachmentfileextension':
				return applyStringFormat(getExtension(context.originalFile.name), format);
			case 'date':
				return moment().format(extractMomentFormat(format) || 'YYYYMMDD');
			case 'time':
				return moment().format(extractMomentFormat(format) || 'HHmmss');
			case 'datetime':
				return moment().format(extractMomentFormat(format) || 'YYYYMMDD-HHmmss');
			case 'timestamp':
				return String(Date.now());
			case 'uuid':
				return createUuid();
			default:
				return '';
		}
	});
}

export function resolveTemplatePath(template: string, context: TemplateContext): string {
	const resolved = resolveTemplate(template, context).trim();
	if (!resolved) {
		return '';
	}

	return resolved
		.replace(/\\/g, '/')
		.split('/')
		.map((segment) => sanitizePathSegment(segment))
		.filter((segment) => segment.length > 0)
		.join('/');
}

export function buildCustomUploadFile(file: File, template: string, context: TemplateContext): File {
	const originalExtension = getExtension(file.name);
	const fallbackName = sanitizeFileName(getBaseName(file.name)) || 'image';
	const resolvedName = sanitizeFileName(resolveTemplate(template, context)) || fallbackName;
	const nextFileName = originalExtension ? `${resolvedName}.${originalExtension}` : resolvedName;

	return new File([file], nextFileName, {
		type: file.type,
		lastModified: file.lastModified
	});
}

function extractMomentFormat(rawFormat: string): string | null {
	const formatMatch = rawFormat.match(/momentJsFormat\s*:\s*(['"])(.*?)\1/i);
	return formatMatch?.[2] ?? null;
}

function applyStringFormat(value: string, rawFormat: string): string {
	let result = value;
	const caseMatch = rawFormat.match(/case\s*:\s*(['"])(lower|upper)\1/i);
	const shouldSlugify = /slugify\s*:\s*true/i.test(rawFormat);

	if (caseMatch?.[2] === 'lower') {
		result = result.toLowerCase();
	} else if (caseMatch?.[2] === 'upper') {
		result = result.toUpperCase();
	}

	if (shouldSlugify) {
		result = slugify(result);
	}

	return result;
}

function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function sanitizePathSegment(segment: string): string {
	if (segment === '.' || segment === '..') {
		return segment;
	}

	return segment.trim().replace(/[<>:"\\|?*\r\n]/g, '-');
}

function sanitizeFileName(value: string): string {
	return value
		.replace(/[<>:"/\\|?*\r\n]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

function getBaseName(fileName: string): string {
	const lastDotIndex = fileName.lastIndexOf('.');
	return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
}

function getExtension(fileName: string): string {
	const lastDotIndex = fileName.lastIndexOf('.');
	return lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1) : '';
}

function createUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
		const random = Math.random() * 16 | 0;
		const value = character === 'x' ? random : (random & 0x3 | 0x8);
		return value.toString(16);
	});
}
