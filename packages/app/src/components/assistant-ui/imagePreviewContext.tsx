import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const ImagePreviewContext = createContext<((src: string) => void) | null>(null);

export function useImagePreviewOpen(): (src: string) => void {
	const fn = useContext(ImagePreviewContext);
	return fn ?? (() => {});
}

type ImagePreviewProviderProps = {
	ns: string;
	children: React.ReactNode;
};

/**
 * 在页面内提供「点击图片 → 全屏预览」，供 composer 附件缩略图与线程内用户图片共用。
 */
export function ImagePreviewProvider({ ns, children }: ImagePreviewProviderProps) {
	const [src, setSrc] = useState<string | null>(null);

	const open = useCallback((next: string) => {
		if (next) setSrc(next);
	}, []);

	useEffect(() => {
		if (!src) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setSrc(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [src]);

	const backdrop = `${ns}-img-preview-backdrop`;
	const panel = `${ns}-img-preview-panel`;
	const imgCls = `${ns}-img-preview-img`;
	const closeBtn = `${ns}-img-preview-close`;

	return (
		<ImagePreviewContext.Provider value={open}>
			{children}
			{src && typeof document !== 'undefined'
				? createPortal(
						<div
							className={backdrop}
							role="presentation"
							onClick={() => setSrc(null)}
						>
							<div
								className={panel}
								role="dialog"
								aria-modal="true"
								aria-label="图片预览"
								onClick={(e) => e.stopPropagation()}
							>
								<button type="button" className={closeBtn} onClick={() => setSrc(null)} aria-label="关闭">
									×
								</button>
								<img className={imgCls} src={src} alt="" />
							</div>
						</div>,
						document.body,
					)
				: null}
		</ImagePreviewContext.Provider>
	);
}
