import React from 'react';
import { ComposerPrimitive } from '@assistant-ui/react';
import { ComposerSortableAttachments } from './composerSortableAttachments';

export type CarveAssistantComposerProps = {
	ns: string;
	placeholder: string;
};

export function CarveAssistantComposer({ ns, placeholder }: CarveAssistantComposerProps) {
	return (
		<ComposerPrimitive.Root className={`${ns}-composer-root ${ns}-input-shell`}>
			<ComposerSortableAttachments ns={ns} />
			<div className={`${ns}-input-editor-wrap`}>
				<ComposerPrimitive.Input
					className={`${ns}-composer-input`}
					placeholder={placeholder}
					submitMode="ctrlEnter"
					rows={1}
					autoFocus={false}
				/>
			</div>
			<div className={`${ns}-composer-actions`}>
				<div className={`${ns}-input-addon`}>
					<ComposerPrimitive.AddAttachment
						className={`${ns}-icon-btn ${ns}-icon-btn--ghost`}
						title="添加附件"
						aria-label="添加附件"
						type="button"
					>
						+
					</ComposerPrimitive.AddAttachment>
				</div>
				<div className={`${ns}-input-addon`}>
					<ComposerPrimitive.Send
						className={`${ns}-send-btn`}
						title="发送（⌘/Ctrl + Enter）"
						aria-label="发送"
						type="submit"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
							<path
								d="M12 19V8M7 13l5-5 5 5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</ComposerPrimitive.Send>
				</div>
			</div>
		</ComposerPrimitive.Root>
	);
}
