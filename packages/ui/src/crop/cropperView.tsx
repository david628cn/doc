import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { CLASSNAME } from '../config';
import './index.less';

export type CropperViewHandle = {
	rotate: (deg: number) => void;
	zoom: (delta: number) => void;
	reset: () => void;
	replace: (image: string) => void;
	getDataUrl: (opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }) => string;
	getBlob: (opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }) => Promise<Blob>;
	destroy: () => void;
};

export type CropperViewProps = {
	className?: string;
	style?: React.CSSProperties;
	image: string;
	aspectRatio?: number;
	circular?: boolean;
	/** cropper 交互配置 */
	dragMode?: Cropper.DragMode;
	cropBoxMovable?: boolean;
	cropBoxResizable?: boolean;
	rotatable?: boolean;
	/** 透出 cropperjs 高级配置（少量场景需要） */
	options?: Omit<Cropper.Options, 'aspectRatio' | 'ready'>;
	onReady?: (cropper: Cropper) => void;
};

export const CropperView = forwardRef<CropperViewHandle, CropperViewProps>(
	(
		{
			className,
			style,
			image,
			aspectRatio,
			circular,
			dragMode,
			cropBoxMovable,
			cropBoxResizable,
			rotatable,
			options,
			onReady,
		},
		ref
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const imgRef = useRef<HTMLImageElement | null>(null);
		const cropperRef = useRef<Cropper | null>(null);
		const [ready, setReady] = useState(false);

		const containerClass = useMemo(() => {
			return [
				`${CLASSNAME}-crop-container`,
				circular ? `${CLASSNAME}-crop-circular` : null,
				className ?? null,
			]
				.filter(Boolean)
				.join(' ');
		}, [circular, className]);

		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			container.innerHTML = '';
			setReady(false);

			const img = document.createElement('img');
			img.src = image;
			img.style.maxWidth = '100%';
			img.style.display = 'block';
			img.crossOrigin = 'anonymous';
			container.appendChild(img);
			imgRef.current = img;

			const cropper = new Cropper(img, {
				dragMode: dragMode ?? 'move',
				cropBoxMovable: cropBoxMovable ?? false,
				cropBoxResizable: cropBoxResizable ?? false,
				rotatable: rotatable ?? true,
				toggleDragModeOnDblclick: false,
				// circular 模式必须保持 1:1，否则 border-radius 会变成椭圆
				aspectRatio: circular ? 1 : (aspectRatio ?? NaN),
				autoCropArea: 0.8,
				viewMode: 0,
				guides: false,
				center: false,
				highlight: false,
				background: false,
				zoomOnWheel: true,
				responsive: true,
				restore: false,
				...(options ?? {}),
				ready: () => {
					// circular 模式：初始化为居中正方形裁剪框（避免某些图片初始 cropBox 不是正方形）
					if (circular) {
						const c = cropper;
						const cd = c.getContainerData();
						const size = Math.max(80, Math.floor(Math.min(cd.width, cd.height) * 0.6));
						c.setCropBoxData({
							left: (cd.width - size) / 2,
							top: (cd.height - size) / 2,
							width: size,
							height: size,
						});
					}
					setReady(true);
					onReady?.(cropper);
				},
			});
			cropperRef.current = cropper;

			return () => {
				cropperRef.current?.destroy();
				cropperRef.current = null;
				imgRef.current = null;
				container.innerHTML = '';
			};
		}, [
			aspectRatio,
			image,
			// onReady,
			// options,
			// dragMode,
			// cropBoxMovable,
			// cropBoxResizable,
			// rotatable,
		]);

		useImperativeHandle(
			ref,
			() => ({
				rotate: (deg: number) => {
					cropperRef.current?.rotate(deg);
				},
				zoom: (delta: number) => {
					cropperRef.current?.zoom(delta);
				},
				reset: () => {
					cropperRef.current?.reset();
				},
				replace: (next: string) => {
					cropperRef.current?.replace(next, true);
				},
				getDataUrl: (opts?: { width?: number; height?: number; type?: 'image/png' | 'image/jpeg'; quality?: number }) => {
					const c = cropperRef.current;
					if (!c) return '';
					const type = opts?.type ?? 'image/png';
					const quality = opts?.quality ?? 0.92;
					const canvas = c.getCroppedCanvas({ width: opts?.width, height: opts?.height });
					return canvas.toDataURL(type, type === 'image/jpeg' ? quality : undefined);
				},
				getBlob: async (opts?: {
					width?: number;
					height?: number;
					type?: 'image/png' | 'image/jpeg';
					quality?: number;
				}) => {
					const c = cropperRef.current;
					if (!c) throw new Error('Cropper not ready');
					const type = opts?.type ?? 'image/png';
					const quality = opts?.quality ?? 0.92;
					const canvas = c.getCroppedCanvas({ width: opts?.width, height: opts?.height });
					return await new Promise<Blob>((resolve, reject) => {
						canvas.toBlob(
							b => {
								if (!b) return reject(new Error('toBlob failed'));
								resolve(b);
							},
							type,
							type === 'image/jpeg' ? quality : undefined
						);
					});
				},
				destroy: () => {
					cropperRef.current?.destroy();
					cropperRef.current = null;
					if (containerRef.current) containerRef.current.innerHTML = '';
				},
			}),
			[]
		);

		return (
			<div
				ref={containerRef}
				className={containerClass}
				style={{
					...style,
					opacity: image ? 1 : 0.6,
				}}
				data-ready={ready ? '1' : '0'}
			/>
		);
	}
);

