import React, { useCallback, useEffect, useState } from 'react';
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	rectSortingStrategy,
	sortableKeyboardCoordinates,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuiState, useThreadRuntime } from '@assistant-ui/react';
import type { Attachment } from '@assistant-ui/react';
import { useImagePreviewOpen } from './imagePreviewContext';

function ComposerAttachmentImage({ ns, className, file }: { ns: string; className: string; file: File }) {
	const [url, setUrl] = useState<string | null>(null);
	const openPreview = useImagePreviewOpen();
	useEffect(() => {
		const u = URL.createObjectURL(file);
		setUrl(u);
		return () => URL.revokeObjectURL(u);
	}, [file]);
	if (!url) return <span className={className} aria-hidden />;
	return (
		<button
			type="button"
			className={`${ns}-composer-attachment-view`}
			onClick={() => openPreview(url)}
			aria-label="查看大图"
			title="查看大图"
		>
			<img className={className} src={url} alt="" draggable={false} />
		</button>
	);
}

function SortableAttachmentItem({
	ns,
	attachment,
}: {
	ns: string;
	attachment: Attachment;
}) {
	const thread = useThreadRuntime();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: attachment.id,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.92 : 1,
	};

	const remove = useCallback(async () => {
		const list = thread.composer.getState().attachments;
		const i = list.findIndex((a) => a.id === attachment.id);
		if (i >= 0) await thread.composer.getAttachmentByIndex(i).remove();
	}, [thread.composer, attachment.id]);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${ns}-composer-attachment${isDragging ? ` ${ns}-composer-attachment--dragging` : ''}`}
		>
			<button
				type="button"
				className={`${ns}-composer-attachment-drag`}
				{...attributes}
				{...listeners}
				aria-label="拖动排序"
				title="拖动排序"
			>
				<span className={`${ns}-composer-attachment-drag-icon`} aria-hidden>
					⠿
				</span>
			</button>
			<div className={`${ns}-composer-attachment-body`}>
				{attachment.type === 'image' && attachment.file ? (
					<ComposerAttachmentImage ns={ns} file={attachment.file} className={`${ns}-composer-attachment-thumb`} />
				) : (
					<span className={`${ns}-composer-attachment-name`} title={attachment.name}>
						{attachment.name}
					</span>
				)}
			</div>
			<button
				type="button"
				className={`${ns}-composer-attachment-tool ${ns}-composer-attachment-remove`}
				title="移除附件"
				aria-label="移除附件"
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => void remove()}
			>
				×
			</button>
		</div>
	);
}

/**
 * 用 {@link useAuiState} 列出 composer 附件，拖拽排序后通过 clear + 重加 File 同步顺序（与库内部 pending 状态一致）。
 * 使用 {@link TouchSensor} + 拖动手柄，减少与外层滚动的手势冲突。
 */
export function ComposerSortableAttachments({ ns }: { ns: string }) {
	const thread = useThreadRuntime();
	const attachments = useAuiState((s) => s.composer.attachments);
	const ids = attachments.map((a) => a.id);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const onDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			const composer = thread.composer;
			const list = composer.getState().attachments;
			const oldIndex = list.findIndex((a) => a.id === active.id);
			const newIndex = list.findIndex((a) => a.id === over.id);
			if (oldIndex < 0 || newIndex < 0) return;
			const reordered = arrayMove([...list], oldIndex, newIndex);
			const files = reordered.map((a) => a.file).filter((f): f is File => f instanceof File);
			if (files.length !== reordered.length) return;
			await composer.clearAttachments();
			for (const f of files) {
				await composer.addAttachment(f);
			}
		},
		[thread.composer],
	);

	if (attachments.length === 0) return null;

	return (
		<div className={`${ns}-composer-attachments-wrap`}>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
				<SortableContext items={ids} strategy={rectSortingStrategy}>
					{attachments.map((att) => (
						<SortableAttachmentItem key={att.id} ns={ns} attachment={att} />
					))}
				</SortableContext>
			</DndContext>
		</div>
	);
}
