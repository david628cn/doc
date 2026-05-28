/**
 * Hocuspocus 默认在 Yjs 文档更新后把同一 {@link OutgoingMessage} 广播给**所有**连接（含发起方）。
 * 发起方本地已应用该增量，回传属冗余。此处对 `Document.prototype.handleUpdate` 打补丁：
 * 不向 `origin` 与自身相同的 `Connection` 再发同一条 update（Yjs 协议下安全，与 y-websocket 常见优化一致）。
 *
 * 若需对比行为，可设环境变量 `COLLAB_SKIP_SELF_ECHO=0` 关闭本补丁。
 */
import { Document, OutgoingMessage } from '@hocuspocus/server';
import type { Connection } from '@hocuspocus/server';

const PATCHED = Symbol('hocuspocusHandleUpdateSkipSelfPatched');

export function applyHocuspocusSkipSelfEchoPatch(): void {
	const docProto = Document.prototype as unknown as {
		handleUpdate: (this: Document, update: Uint8Array, origin: unknown) => Document;
		[PATCHED]?: boolean;
	};
	if (docProto[PATCHED]) {
		return;
	}
	docProto[PATCHED] = true;

	const skipSelf =
		process.env.COLLAB_SKIP_SELF_ECHO !== '0' && process.env.COLLAB_SKIP_SELF_ECHO !== 'false';

	docProto.handleUpdate = function handleUpdateWithSkipSelf(
		this: Document,
		update: Uint8Array,
		origin: unknown,
	) {
		this.callbacks.onUpdate(this, origin as Connection, update);

		const message = new OutgoingMessage(this.name).createSyncMessage().writeUpdate(update);

		this.getConnections().forEach((connection: Connection) => {
			if (skipSelf && origin != null && connection === origin) {
				return;
			}
			this.logger?.log({
				direction: 'out',
				type: message.type,
				category: message.category,
			});
			connection.send(message.toUint8Array());
		});

		return this;
	};
}
