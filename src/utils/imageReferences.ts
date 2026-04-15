export interface ParsedImageReference {
	source: string;
	path: string;
	altText: string;
	index: number;
	length: number;
	syntax: 'markdown' | 'wiki' | 'url';
	isRemote: boolean;
}

export interface ClipboardHtmlImage {
	url: string;
	altText: string;
}

const MARKDOWN_IMAGE_REGEX =
	/!\[(.*?)\]\(<([^>]+)>(?:\s+(?:"[^"]*"|'[^']*'))?\)|!\[(.*?)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
const WIKI_IMAGE_REGEX = /!\[\[([^\]]+)\]\]/g;
const IMAGE_URL_REGEX = /https?:\/\/[^\s<>"']+/g;
const IMAGE_EXTENSION_REGEX =
	/\.(apng|avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i;

export function extractMarkdownAndWikiImageReferences(
	content: string
): ParsedImageReference[] {
	const references: ParsedImageReference[] = [];

	for (const match of content.matchAll(MARKDOWN_IMAGE_REGEX)) {
		const path = (match[2] ?? match[4] ?? '').trim();
		if (!path) {
			continue;
		}
		const rawAltText = (match[1] ?? match[3] ?? '').trim();

		references.push({
			source: match[0],
			path,
			altText: normalizeMarkdownAltText(rawAltText),
			index: match.index ?? 0,
			length: match[0].length,
			syntax: 'markdown',
			isRemote: isRemotePath(path)
		});
	}

	for (const match of content.matchAll(WIKI_IMAGE_REGEX)) {
		const wikiParts = parseWikiImageTarget((match[1] ?? '').trim());
		const path = wikiParts.path;
		if (!path) {
			continue;
		}

		references.push({
			source: match[0],
			path,
			altText: wikiParts.altText,
			index: match.index ?? 0,
			length: match[0].length,
			syntax: 'wiki',
			isRemote: isRemotePath(path)
		});
	}

	return references.sort((left, right) => left.index - right.index);
}

export function extractPlainImageUrlReferences(content: string): ParsedImageReference[] {
	const references: ParsedImageReference[] = [];
	const trimmedContent = content.trim();

	for (const match of content.matchAll(IMAGE_URL_REGEX)) {
		const path = (match[0] ?? '').trim();
		if (!looksLikeImageUrl(path)) {
			continue;
		}

		references.push({
			source: path,
			path,
			altText: '',
			index: match.index ?? 0,
			length: path.length,
			syntax: 'url',
			isRemote: true
		});
	}

	if (references.length === 0 && /^https?:\/\/\S+$/i.test(trimmedContent)) {
		references.push({
			source: trimmedContent,
			path: trimmedContent,
			altText: '',
			index: content.indexOf(trimmedContent),
			length: trimmedContent.length,
			syntax: 'url',
			isRemote: true
		});
	}

	return references;
}

export function extractClipboardHtmlImages(
	clipboardData: DataTransfer
): ClipboardHtmlImage[] {
	const html = clipboardData.getData('text/html');
	if (!html) {
		return [];
	}

	const parser = new DOMParser();
	const document = parser.parseFromString(html, 'text/html');
	const seen = new Set<string>();
	const images: ClipboardHtmlImage[] = [];

	document.querySelectorAll('img[src]').forEach((image) => {
		const src = image.getAttribute('src')?.trim() ?? '';
		if (!isRemotePath(src) || seen.has(src)) {
			return;
		}

		seen.add(src);
		images.push({
			url: src,
			altText: image.getAttribute('alt')?.trim() ?? ''
		});
	});

	return images;
}

export function isRemotePath(path: string): boolean {
	return /^https?:\/\//i.test(path.trim());
}

export function looksLikeImageUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return IMAGE_EXTENSION_REGEX.test(parsed.pathname + parsed.search);
	} catch {
		return false;
	}
}

function parseWikiImageTarget(target: string): { path: string; altText: string } {
	const segments = target.split('|').map((segment) => segment.trim());
	const path = segments[0] ?? '';

	if (segments.length <= 1) {
		return { path, altText: '' };
	}

	if (segments.length >= 3) {
		return { path, altText: segments[1] ?? '' };
	}

	const second = segments[1] ?? '';
	if (isImageSizeToken(second)) {
		return { path, altText: '' };
	}

	return { path, altText: second };
}

function normalizeMarkdownAltText(altText: string): string {
	const separatorIndex = altText.lastIndexOf('|');
	if (separatorIndex <= 0) {
		return altText;
	}

	const maybeSize = altText.slice(separatorIndex + 1).trim();
	if (!isImageSizeToken(maybeSize)) {
		return altText;
	}

	return altText.slice(0, separatorIndex).trim();
}

function isImageSizeToken(value: string): boolean {
	const normalized = value.trim().toLowerCase();
	return /^\d+%?$/.test(normalized) || /^\d+x\d+$/.test(normalized);
}
