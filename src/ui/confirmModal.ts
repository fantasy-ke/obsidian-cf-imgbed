import { App, Modal, Setting } from 'obsidian';

export interface ConfirmModalOptions {
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	onConfirm: () => void;
}

/** 简单的确认对话框：用于批量迁移等需要用户明确同意的操作。 */
export class ConfirmModal extends Modal {
	constructor(app: App, private options: ConfirmModalOptions) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: this.options.title });
		for (const paragraph of this.options.message.split('\n')) {
			contentEl.createEl('p', { text: paragraph });
		}
		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText(this.options.cancelText)
				.onClick(() => this.close()))
			.addButton((button) => button
				.setButtonText(this.options.confirmText)
				.setCta()
				.onClick(() => {
					this.close();
					this.options.onConfirm();
				}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
