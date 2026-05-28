import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Doc } from './index';

function App() {
	const [editable, setEditable] = useState(true);
	return (
		<div style={{
			height: '100%',
			position: 'relative'
		}}>
			<div style={{
				height: '30px',
				// position: 'absolute',
				// top: '30px',
				// right: '30px'
				textAlign: 'right',
				background: '#eee'
			}}>
				<button onClick={() => setEditable(!editable)}>{ editable ? '编辑' : '查看' }</button>
			</div>
			<Doc editable={editable}></Doc>
		</div>
		
	);
}

// Render the app
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}

export default App;