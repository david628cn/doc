import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { CLASSNAME } from '../../config';
import './index.less';

const func = () => {}

interface PopupProps {
    isAimated?: boolean;
    enter?: string;
    leave?: string;
    visible?: boolean;
    didUpdate?: Function;
    getContainer?: Function;
    onMouseEnter?: any;
    onMouseLeave?: any;
    onMouseDown?: any;
    onTouchStart?: any;
    mask?: any;
    children?: any;
}

interface PopupState {
    visible: boolean;
}

class Popup extends Component<PopupProps, PopupState> {
    static defaultProps = {
        isAimated: true,
        enter: 'slideInUp',
        leave: 'slideOutUp',
        didUpdate: func,
        onMaskClick: func,
        onMouseEnter: func,
        onMouseLeave: func,
        onMouseDown: func,
        onTouchStart: func
    };
    private timeoutId: any = null;
    private _container: any;
    private _component: any;
    private focusElement: any;
    constructor(props: PopupProps) {
        super(props);
    }
    componentDidMount() {
        this.createContainer();
    }
    componentWillReceiveProps(nextProps: PopupProps) { }
    componentDidUpdate(prevProps: PopupProps, prevState: PopupState) {
        clearTimeout(this.timeoutId);
        if (this.props.visible) {
            this._component.style.display = 'block';
        }
        if (!this._component.contains(document.activeElement)) {
            this.focusElement.focus();
        }
        const didUpdate = this.props.didUpdate;
        if (didUpdate) {
            didUpdate(prevProps, this._component);
        }
        if (!this.props.visible) {
            this.timeoutId = setTimeout(() => {
                if (this._component) {
                    this._component.style.display = 'none';
                }
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }, 200);
        }
    }
    componentWillUnmount() {
        this.removeContainer();
    }
    createContainer = () => {
        this._container = this.props.getContainer?.();
        this.forceUpdate();
    }
    removeContainer = () => {
        if (this._container) {
            this._container.parentNode.removeChild(this._container);
        }
    }
    saveRef = (name: string) => (node: any) => {
        const scope: any = this;
        scope[name] = node;
    }
    getCls(is: boolean = false) {
        const { isAimated, enter, leave } = this.props;
        let rs = [`${CLASSNAME}-popup-contain`];
        if (is) {
            rs.push(`${CLASSNAME}-dropdown`);
            rs.push(`${CLASSNAME}-popup-contain-open`);
            if (isAimated) {
                rs.push(`animated`);
            }
            rs.push(`${enter}`);
        } else {
            rs.push(`${CLASSNAME}-dropdown`);
            rs.push(`${CLASSNAME}-popup-contain-hidden`);
            if (isAimated) {
                rs.push(`animated`);
            }
            rs.push(`${leave}`);
        }
        return rs.join(' ');
    }
    render() {
        if (this._container) {
            const { 
                visible, 
                mask,
                onMouseEnter, 
                onMouseLeave,
                onMouseDown,
                onTouchStart
            } = this.props;
            let className = this.getCls(visible);
            const cls = [`${CLASSNAME}-popup-inner`];
            return ReactDOM.createPortal(
                <div className={cls.join(' ')}>
                    {mask}
                    <div
                        className={className}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        ref={this.saveRef('_component')}
                    >
                        <div
                            tabIndex={0}
                            ref={this.saveRef('focusElement')}
                            aria-hidden="true"
                        />
                        {this.props.children}
                    </div>
                </div>,
                this._container
            );
        }
        return null;
    }
}

export default Popup;