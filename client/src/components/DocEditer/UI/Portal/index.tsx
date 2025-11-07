import { ReactNode } from 'react';
import ReactDOM from 'react-dom';

const Portal = ({ children }: { children?: ReactNode }) => {
    return typeof document === 'object'
        ? ReactDOM.createPortal(children, document.body)
        : null
}

export default Portal; 