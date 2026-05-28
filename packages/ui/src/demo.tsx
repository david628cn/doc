import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageCropper } from './crop'; // 确保路径正确

function getCropObjectStyle(cropData: any, imageData: any) {
	
}

function App() {
	// 🔴 改用一个状态来存储包装样式和图片样式
	const [cropData, setCropData] = useState<any>({});
	const elRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLDivElement>(null);

	return (
		<div style={{ minHeight: '100vh', background: '#fafafa' }}>
			<div
				style={{
					maxWidth: 800,
					margin: '100px',
					padding: '12px 16px 0'
				}}
			>
				<button onClick={() => {
					if (!imgRef.current || !elRef.current) return;

					ImageCropper.crop(elRef.current, {
						img: imgRef.current,
						onOk: (blob: Blob | null, dataUrl: string, cssTr: any) => {
							// const ds = data?.ds ?? data;
							// const imgDs = data?.imgDs;
							// console.log('第二张图裁剪完成', ds, imgDs);
							// 🔴 核心修改：保存全套排版样式
							// const styleData = getCropObjectStyle(ds, imgDs);
							console.log('cssTr', cssTr)
							setCropData(cssTr);
						}
					});
				}}>Test</button>

				<div ref={imgRef} style={{ position: 'relative', display: 'inline-block' }}>
					{/* 🔴 核心修改：动态为包裹 div 赋予计算后的宽高 */}
					<div
						style={{
							position: 'relative',
							overflow: 'hidden',
							...cropData.containerStyle
						}}
					>
						<img
							src="https://template.tiptap.dev/images/tiptap-ui-placeholder-image.jpg"
							style={{
								objectFit: 'cover',
								display: 'block',
								width: '900px',
								// objectPosition: cropData.objectPosition
								...cropData.imageStyle
							}}
						/>
					</div>
					<div ref={elRef} style={{ position: 'absolute', left: 0, top: 0, zIndex: 10 }}></div>
				</div>
				<div>dsfsdfsdf</div>
			</div>
		</div>
	);
}

const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}

export default App;
