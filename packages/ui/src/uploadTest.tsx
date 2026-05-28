import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BaseImageUpload } from './imageUpload';

function App() {

	const elRef = useRef<any>(null);
	const imgRef = useRef<any>(null);

	let resizer: any = null;

	return (
		<div style={{ minHeight: '100vh', background: '#fafafa' }}>
			<div
				style={{
					maxWidth: 800,
					margin: '100px',
					padding: '12px 16px 0'
				}}
			>
				<button
					onClick={() => {
						if (!imgRef.current || !elRef.current) return;
						const dom = new BaseImageUpload();
						imgRef.current.appendChild(dom.element);
					}}
				>Test</button>

				<button
					onClick={() => {
						if (!imgRef.current || !elRef.current) return;

						if (resizer) {
							resizer.hide();
						}
					}}
				>Test</button>

				<div ref={elRef} style={{ position: 'relative', display: 'inline-block' }}>
					{/* 🔴 核心修改：动态为包裹 div 赋予计算后的宽高 */}
					<div
						style={{
							position: 'relative',
							overflow: 'hidden'
						}}
					>
						<img
							src="https://template.tiptap.dev/images/tiptap-ui-placeholder-image.jpg"
							style={{
								objectFit: 'cover',
								display: 'block',
								width: '900px'
							}}
						/>
					</div>
					<div ref={imgRef} style={{ position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, zIndex: 10 }}></div>
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
