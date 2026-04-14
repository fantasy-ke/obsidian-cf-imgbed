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
	/!\[(.*?)\]\(<([^>]+)>\)|!\[(.*?)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKI_IMAGE_REGEX = /!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
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

		references.push({
			source: match[0],
			path,
			altText: (match[1] ?? match[3] ?? '').trim(),
			index: match.index ?? 0,
			length: match[0].length,
			syntax: 'markdown',
			isRemote: isRemotePath(path)
		});
	}

	for (const match of content.matchAll(WIKI_IMAGE_REGEX)) {
		const path = (match[1] ?? '').trim();
		if (!path) {
			continue;
		}

		references.push({
			source: match[0],
			path,
			altText: (match[2] ?? '').trim(),
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
