import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import { ImageHandler } from '../upload/imageHandler';
import { CFImageBedSettings } from '../types';
import { I18n } from '../utils/i18n';
import { ConfirmModal } from '../ui/confirmModal';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'apng', 'heic', 'heif', 'ico']);

export interface AutoUploadScope {
	wholeVault: boolean;
	folders: string[];
}

interface FileState {
	timer: ReturnType<typeof setTimeout> | null;
	processing: boolean;
	/** 处理期间又收到改动 / 条件写回被拒绝 → 本轮结束后重新排队。 */
	rerun: boolean;
	/** 由手动「扫描并迁移」发起：重跑 / 重试时保留，不受「图片自动上云」开关约束。 */
	manual: boolean;
	/** 连续上传失败次数，用于有限退避重试；成功后清零。 */
	attempts: number;
	/** 因「图片其实已可解析」而立即重跑的次数；有上限，防止解析结果与上传方不一致时无限重跑。 */
	unresolvedReruns: number;
}

interface QueueItem {
	path: string;
	/** 手动「扫描并迁移」命令排队的任务，不受「图片自动上云」开关约束。 */
	manual: boolean;
}

/** 解析监听范围：未配置文件夹且未开启「整个库」时返回 null（= 不监听）。 */
export function resolveAutoUploadScope(settings: Pick<CFImageBedSettings, 'autoUploadFolders' | 'autoUploadWholeVault'>): AutoUploadScope | null {
	if (settings.autoUploadWholeVault) {
		return { wholeVault: true, folders: [] };
	}
	const folders = (settings.autoUploadFolders || '')
		.split(',')
		.map((folder) => folder.trim().replace(/^\/+|\/+$/g, ''))
		.filter((folder) => folder.length > 0);
	return folders.length > 0 ? { wholeVault: false, folders } : null;
}

export function isPathInScope(path: string, scope: AutoUploadScope): boolean {
	if (scope.wholeVault) {
		return true;
	}
	return scope.folders.some((folder) => path === folder || path.startsWith(folder + '/'));
}

/**
 * 图片自动上云监听器。
 *
 * 监听 vault 的 create / modify（无法区分外部写入与编辑器保存，两者一视同仁），
 * 对监听范围内的 Markdown 笔记：上传其中的库内图片 / 远程图片，改写链接。
 *
 * 安全设计：
 *  - 范围明确：必须配置文件夹或显式开启「整个库」，否则不处理任何笔记。
 *  - 每文件防抖 + 全局并发上限，批量写入不会打爆图床。
 *  - 处理中再次改动 → 标记 rerun，本轮结束后重新排队；条件写回被拒绝也重跑，绝不覆盖用户新内容。
 *  - 自动模式只读库内图片（allowAbsolutePaths: false）。
 *  - 库内找不到的图片（笔记先落盘、图片后落盘）记入等待表，图片 create 时唤醒对应笔记。
 *  - 幂等：已上云的链接在排除域名内，二次扫描为 0，不会自我循环。
 *  - unload 后丢弃所有迟到结果，不再写文件。
 */
export class AutoUploadWatcher {
	static maxConcurrent = 2;
	static minDebounceMs = 500;
	/** 上传失败后的退避重试间隔；用尽后进入 exhausted，等网络恢复（online 事件）或下一次改动。 */
	static retryDelaysMs = [5000, 30000, 120000];

	private states = new Map<string, FileState>();
	private queue: QueueItem[] = [];
	private queued = new Set<string>();
	private active = 0;
	private waitingForImage = new Map<string, Set<string>>();
	private exhausted = new Set<string>();
	private disposed = false;

	constructor(
		private plugin: Plugin,
		private imageHandler: ImageHandler,
		private getSettings: () => CFImageBedSettings,
		private i18n: I18n
	) {}

	/** 在 workspace.onLayoutReady 回调里调用：注册事件并对监听范围补扫一次。 */
	register(): void {
		const vault = this.plugin.app.vault;
		this.plugin.registerEvent(vault.on('create', (file) => this.onVaultChange(file)));
		this.plugin.registerEvent(vault.on('modify', (file) => this.onVaultChange(file)));
		this.plugin.registerEvent(vault.on('rename', (file, oldPath) => this.onRename(file, oldPath)));
		this.plugin.registerEvent(vault.on('delete', (file) => this.onDelete(file)));
		if (typeof window !== 'undefined') {
			// 网络恢复：把退避用尽的笔记重新排队
			this.plugin.registerDomEvent(window, 'online', () => this.onOnline());
		}

		const settings = this.getSettings();
		const scope = settings?.enableAutoUpload ? resolveAutoUploadScope(settings) : null;
		if (scope) {
			this.enqueueScope(scope, false);
		}
	}

	unload(): void {
		this.disposed = true;
		for (const state of this.states.values()) {
			if (state.timer) {
				clearTimeout(state.timer);
			}
		}
		this.states.clear();
		this.queue = [];
		this.queued.clear();
		this.waitingForImage.clear();
		this.exhausted.clear();
	}

	private onOnline(): void {
		for (const path of Array.from(this.exhausted)) {
			this.exhausted.delete(path);
			const state = this.getState(path);
			state.attempts = 0;
			this.schedule(path, state.manual);
		}
	}

	/** 命令：统计范围内待转存图片 → 确认 → 排队处理。未配置范围时按整个库处理，并在对话框里说明。 */
	async scanAndMigrate(): Promise<void> {
		const settings = this.getSettings();
		const scope = resolveAutoUploadScope(settings) ?? { wholeVault: true, folders: [] };
		const scopeLabel = scope.wholeVault
			? this.i18n.t('autoUpload.scopeWholeVault')
			: this.i18n.t('autoUpload.scopeFolders', { folders: scope.folders.join(', ') });

		const summary = await this.countScope(scope);
		if (summary.images === 0) {
			new Notice(this.i18n.t('autoUpload.scanNothing', { scope: scopeLabel }));
			return;
		}

		new ConfirmModal(this.plugin.app, {
			title: this.i18n.t('autoUpload.scanConfirmTitle'),
			message: this.i18n.t('autoUpload.scanConfirmMessage', {
				scope: scopeLabel,
				notes: summary.notes,
				images: summary.images
			}),
			confirmText: this.i18n.t('autoUpload.confirm'),
			cancelText: this.i18n.t('autoUpload.cancel'),
			onConfirm: () => {
				const queuedNotes = this.enqueueScope(scope, true);
				new Notice(this.i18n.t('autoUpload.scanQueued', { notes: queuedNotes }));
			}
		}).open();
	}

	/** 只统计，不上传。 */
	async countScope(scope: AutoUploadScope): Promise<{ notes: number; images: number }> {
		let notes = 0;
		let images = 0;
		for (const file of this.listScopeFiles(scope)) {
			const content = await this.plugin.app.vault.cachedRead(file);
			const count = this.imageHandler.countUploadableImages(content);
			if (count > 0) {
				notes++;
				images += count;
			}
		}
		return { notes, images };
	}

	/** 把范围内所有笔记排队，返回排队数。 */
	enqueueScope(scope: AutoUploadScope, manual: boolean): number {
		const files = this.listScopeFiles(scope);
		for (const file of files) {
			this.enqueue(file.path, manual);
		}
		return files.length;
	}

	private listScopeFiles(scope: AutoUploadScope): TFile[] {
		return this.plugin.app.vault.getMarkdownFiles()
			.filter((file) => this.isWatchableNote(file) && isPathInScope(file.path, scope));
	}

	private isWatchableNote(file: TFile): boolean {
		// Excalidraw 绘图也是 .md，但其图片由 Excalidraw 集成单独处理
		return file.extension === 'md' && !file.name.toLowerCase().endsWith('.excalidraw.md');
	}

	private onVaultChange(file: TAbstractFile): void {
		if (this.disposed || !(file instanceof TFile)) {
			return;
		}
		const settings = this.getSettings();
		if (!settings?.enableAutoUpload) {
			return;
		}
		if (IMAGE_EXTENSIONS.has(file.extension.toLowerCase())) {
			this.onImageArrived(file);
			return;
		}
		if (!this.isWatchableNote(file)) {
			return;
		}
		const scope = resolveAutoUploadScope(settings);
		if (!scope || !isPathInScope(file.path, scope)) {
			return;
		}
		this.schedule(file.path);
	}

	private onRename(file: TAbstractFile, oldPath: string): void {
		const state = this.states.get(oldPath);
		if (state) {
			if (state.timer) {
				clearTimeout(state.timer);
			}
			this.states.delete(oldPath);
		}
		this.queue = this.queue.filter((item) => item.path !== oldPath);
		this.queued.delete(oldPath);
		this.exhausted.delete(oldPath);
		// 改名后的文件按新路径重新走一遍范围判断
		this.onVaultChange(file);
	}

	private onDelete(file: TAbstractFile): void {
		const state = this.states.get(file.path);
		if (state?.timer) {
			clearTimeout(state.timer);
		}
		this.states.delete(file.path);
		this.queue = this.queue.filter((item) => item.path !== file.path);
		this.queued.delete(file.path);
		this.exhausted.delete(file.path);
	}

	private onImageArrived(image: TFile): void {
		const key = image.name.toLowerCase();
		const notes = this.waitingForImage.get(key);
		if (!notes) {
			return;
		}
		this.waitingForImage.delete(key);
		for (const notePath of notes) {
			this.schedule(notePath);
		}
	}

	private waitForImage(referencePath: string, notePath: string): void {
		const key = imageBasename(referencePath);
		if (!key) {
			return;
		}
		let notes = this.waitingForImage.get(key);
		if (!notes) {
			notes = new Set<string>();
			this.waitingForImage.set(key, notes);
		}
		notes.add(notePath);
	}

	private getState(path: string): FileState {
		let state = this.states.get(path);
		if (!state) {
			state = { timer: null, processing: false, rerun: false, manual: false, attempts: 0, unresolvedReruns: 0 };
			this.states.set(path, state);
		}
		return state;
	}

	private debounceDelay(): number {
		const settings = this.getSettings();
		return Math.max(AutoUploadWatcher.minDebounceMs, settings?.autoUploadDebounceMs ?? 2000);
	}

	private schedule(path: string, manual = false, delayMs?: number): void {
		if (this.disposed) {
			return;
		}
		const state = this.getState(path);
		state.manual = state.manual || manual;
		if (state.processing) {
			state.rerun = true;
			return;
		}
		if (state.timer) {
			clearTimeout(state.timer);
		}
		state.timer = setTimeout(() => {
			state.timer = null;
			this.enqueue(path, state.manual);
		}, delayMs ?? this.debounceDelay());
	}

	/** 非手动任务在处理前和写回前都要再确认：开关仍开、路径仍在范围内。 */
	private isStillWatched(path: string): boolean {
		const settings = this.getSettings();
		if (!settings?.enableAutoUpload) {
			return false;
		}
		const scope = resolveAutoUploadScope(settings);
		return scope !== null && isPathInScope(path, scope);
	}

	/**
	 * 用与上传方（ImageHandler.resolveLocalFile）相同的方式判断引用现在能否解析：
	 * 链接路径解析、库内精确路径、相对于笔记的相对路径。只按文件名搜索会在
	 * 「其他目录有同名图片但引用本身解析不到」时无限重跑。
	 */
	private canResolveNow(referencePath: string, notePath: string): boolean {
		let decoded = referencePath.trim();
		try {
			decoded = decodeURIComponent(decoded);
		} catch {
			// 保留原文
		}
		const normalized = decoded.replace(/^<|>$/g, '').replace(/\\/g, '/').replace(/^\/+/, '');
		if (!normalized) {
			return false;
		}
		const { metadataCache, vault } = this.plugin.app;
		const byLink = metadataCache.getFirstLinkpathDest(normalized, notePath);
		if (byLink instanceof TFile) {
			return true;
		}
		if (vault.getAbstractFileByPath(normalized) instanceof TFile) {
			return true;
		}
		if (normalized.startsWith('./') || normalized.startsWith('../')) {
			const noteDir = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
			const parts = noteDir ? noteDir.split('/') : [];
			for (const part of normalized.split('/')) {
				if (part === '..') {
					parts.pop();
				} else if (part !== '.') {
					parts.push(part);
				}
			}
			return vault.getAbstractFileByPath(parts.join('/')) instanceof TFile;
		}
		return false;
	}

	private enqueue(path: string, manual: boolean): void {
		if (this.disposed || this.queued.has(path)) {
			return;
		}
		this.queued.add(path);
		this.queue.push({ path, manual });
		this.pump();
	}

	private pump(): void {
		while (!this.disposed && this.active < AutoUploadWatcher.maxConcurrent && this.queue.length > 0) {
			const item = this.queue.shift() as QueueItem;
			this.queued.delete(item.path);
			this.active++;
			void this.processFile(item).finally(() => {
				this.active--;
				this.pump();
			});
		}
	}

	private async processFile(item: QueueItem): Promise<void> {
		if (this.disposed) {
			return;
		}
		const settings = this.getSettings();
		if (!item.manual && !this.isStillWatched(item.path)) {
			return; // 排队期间开关被关掉或范围被缩小
		}
		const vault = this.plugin.app.vault;
		const file = vault.getAbstractFileByPath(item.path);
		if (!(file instanceof TFile)) {
			return;
		}

		const state = this.getState(item.path);
		state.processing = true;
		state.rerun = false;
		state.manual = state.manual || item.manual;
		let retryDelay: number | null = null;
		try {
			const original = await vault.read(file);
			const result = await this.imageHandler.uploadImagesInText(original, file, file.path, {
				allowAbsolutePaths: false
			});
			if (this.disposed) {
				return;
			}
			if (file.path !== item.path) {
				return; // 处理期间笔记被改名/移动：本任务作废，改名事件已按新路径重新判断
			}
			if (!state.manual && !this.isStillWatched(file.path)) {
				return; // 处理期间开关被关掉或范围被缩小：不写回
			}
			// 网络/上传失败（不含「库内找不到图片」）→ 有限退避重试
			const uploadFailures = result.failed - result.unresolvedLocal.length;
			if (uploadFailures > 0) {
				const delay = AutoUploadWatcher.retryDelaysMs[state.attempts];
				state.attempts++;
				if (delay !== undefined) {
					retryDelay = delay;
				} else {
					this.exhausted.add(item.path);
				}
			} else {
				state.attempts = 0;
				this.exhausted.delete(item.path);
			}
			if (result.success > 0) {
				// 条件写回：仅当磁盘内容仍等于处理快照时才覆盖；否则保留用户新内容并重跑。
				const written = await vault.process(file, (current) =>
					current === original ? result.content : current
				);
				if (written === result.content) {
					// 写回成功：期间收到的 modify 事件来自我们自己的写入，不需要重跑。
					// 用户若在上传期间改过内容，条件写回会失败并走下面的 rerun 分支。
					state.rerun = false;
					if (settings?.showUploadProgress) {
						new Notice(this.i18n.t('notices.autoUploadSummary', {
							count: String(result.success),
							file: file.name
						}));
					}
				} else {
					state.rerun = true;
				}
			}
			for (const unresolved of result.unresolvedLocal) {
				// 图片可能在我们登记等待之前就已落盘（create 事件已错过）：能解析就立即重跑（有上限），否则登记等待
				if (state.unresolvedReruns < 2 && this.canResolveNow(unresolved, file.path)) {
					state.unresolvedReruns++;
					state.rerun = true;
				} else {
					this.waitForImage(unresolved, file.path);
				}
			}
		} catch (error) {
			console.error('CF ImageBed auto-upload failed:', error);
		} finally {
			state.processing = false;
			if (this.disposed) {
				return;
			}
			if (state.rerun) {
				state.rerun = false;
				this.schedule(item.path, state.manual);
			} else if (retryDelay !== null) {
				this.schedule(item.path, state.manual, retryDelay);
			} else if (!state.timer && !this.exhausted.has(item.path)) {
				this.states.delete(item.path);
			}
		}
	}
}

function imageBasename(referencePath: string): string {
	let decoded = referencePath;
	try {
		decoded = decodeURIComponent(referencePath);
	} catch {
		// 保留原文
	}
	const cleaned = decoded.replace(/\\/g, '/').split('?')[0].split('#')[0].split('|')[0].trim();
	const segments = cleaned.split('/');
	return (segments[segments.length - 1] || '').toLowerCase();
}
