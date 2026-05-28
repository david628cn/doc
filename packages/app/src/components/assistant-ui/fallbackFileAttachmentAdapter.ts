import type {
	AttachmentAdapter,
	CompleteAttachment,
	PendingAttachment,
} from '@assistant-ui/react';

function readAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

/**
 * 放在 {@link CompositeAttachmentAdapter} 的最后一项，用于承接不匹配图片/纯文本 accept 的文件（如 PDF、Office）。
 */
export class SimpleFallbackFileAttachmentAdapter implements AttachmentAdapter {
	readonly accept = '*';

	async add(state: { file: File }): Promise<PendingAttachment> {
		return {
			id: `${state.file.name}-${Date.now()}`,
			type: 'file',
			name: state.file.name,
			contentType: state.file.type || 'application/octet-stream',
			file: state.file,
			status: { type: 'requires-action', reason: 'composer-send' },
		};
	}

	async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
		const data = await readAsDataURL(attachment.file);
		return {
			...attachment,
			status: { type: 'complete' },
			content: [
				{
					type: 'file',
					filename: attachment.name,
					mimeType: attachment.file.type || 'application/octet-stream',
					data,
				},
			],
		};
	}

	async remove(): Promise<void> {
		// noop
	}
}
