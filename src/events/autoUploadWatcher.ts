import { Notice, Plugin, TAbstractFile, TFile, debounce } from 'obsidian';
import { ImageHandler } from '../upload/imageHandler';
import { CFImageBedSettings } from '../types';
import { I18n } from '../utils/i18n';

type DebouncedFn = ReturnType<typeof debounce>;

/**
 * 自动上传监听器：监听 vault 的 create / modify 事件，对「从外部写入磁盘」的
 * Markdown 笔记（如 AI 通过 CLI 写文件、Web Clip 存网页）自动检查其中的本地/远程
 * 图片，转存到图床并改写链接。
 *
 * 安全设计：
 *  - 仅在 onLayoutReady 之后注册（见 main.ts），避免启动时全库 create 事件风暴。
 *  - 每个文件独立防抖，等写入落定再处理，绝不动到正在写的内容。
 *  - processing 集合 + 幂等性（转存后图片已在图床域、被排除域过滤，二次扫描为 0）
 *    双重断环，杜绝「自己改写又触发 modify」的死循环。
 *  - vault.process 原子写回，且仅当磁盘内容仍等于所处理快照时才覆盖。
 */
export class AutoUploadWatcher {
	private processing = new Set<string>();
	private debouncers = new Map<string, DebouncedFn>();

	constructor(
		private plugin: Plugin,
		private imageHandler: ImageHandler,
		private getSettings: () => CFImageBedSettings,
		private i18n: I18n
	) {}

	/** 在 workspace.onLayoutReady 回调里调用，避免启动事件风暴。 */
	register(): void {
		const vault = this.plugin.app.vault;
		this.plugin.registerEvent(vault.on('create', (file) => this.onVaultChange(file)));
		this.plugin.registerEvent(vault.on('modify', (file) => this.onVaultChange(file)));
	}

	private onVaultChange(file: TAbstractFile): void {
		const settings = this.getSettings();
		if (!settings?.enableAutoUpload) {
			return;
		}
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return;
		}
		if (!this.isWatchedPath(file.path, settings)) {
			return;
		}
		if (this.processing.has(file.path)) {
			return;
		}

		const delay = Math.max(500, settings.autoUploadDebounceMs ?? 2000);
		let debounced = this.debouncers.get(file.path);
		if (!debounced) {
			debounced = debounce(() => {
				void this.processFile(file.path);
			}, delay, true);
			this.debouncers.set(file.path, debounced);
		}
		debounced();
	}

	private isWatchedPath(path: string, settings: CFImageBedSettings): boolean {
		const folders = (settings.autoUploadFolders || '')
			.split(',')
			.map((f) => f.trim().replace(/^\/+|\/+$/g, ''))
			.filter((f) => f.length > 0);
		if (folders.length === 0) {
			return true; // 未配置 = 全库
		}
		return folders.some((folder) => path === folder || path.startsWith(folder + '/'));
	}

	private async processFile(path: string): Promise<void> {
		if (this.processing.has(path)) {
			return;
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			return;
		}

		this.processing.add(path);
		try {
			const original = await this.plugin.app.vault.read(file);
			const result = await this.imageHandler.uploadImagesInText(original, file, file.path);
			if (result.success > 0) {
				// 原子写回：仅当磁盘内容仍等于刚处理的快照时才覆盖，避免覆盖期间的新改动。
				await this.plugin.app.vault.process(file, (current) =>
					current === original ? result.content : current
				);
				const settings = this.getSettings();
				if (settings?.showUploadProgress) {
					new Notice(this.i18n.t('notices.autoUploadSummary', {
						count: String(result.success),
						file: file.name
					}));
				}
			}
		} catch (error) {
			console.error('CF ImageBed auto-upload failed:', error);
		} finally {
			this.processing.delete(path);
		}
	}
}
