import React, { Component } from 'react';
import Popup from './popup';
import { EventEmit, alignTo } from './dldh';

const func = () => {}

interface DropdownProps {
    defaultVisible?: boolean;
    visible?: boolean;
    sprefix?: string;
    mouseEnterDelay?: any;
    mouseLeaveDelay?: any;
    focusDelay?: any;
    blurDelay?: any;
    trigger?: any;
    width?: string;
    placement?: string;
    showTrigger?: any;
    hideTrigger?: any;
    mask?: any;
    maskClosable?: boolean;
    menu?: any;
    onPopupVisibleChange?: Function;
    afterPopupVisibleChange?: Function;
    getPopupContainer?: Function;
    getDocument?: Function;
    children?: any;
}

interface DropdownState {
    visible: boolean;
}

class Dropdown extends Component<DropdownProps, DropdownState> {
    static defaultProps = {
        sprefix: 'dwrui',
        mouseEnterDelay: 0,
        mouseLeaveDelay: 0.1,
        trigger: [],
        //action: ['contextMenu', 'hover', 'click'],
        showTrigger: [],
        hideTrigger: [],
        //trigger: 'hover',
        placement: 'tl-bl?',
        onPopupVisibleChange: func,
        afterPopupVisibleChange: func,
        getDocument: () => {
            return window.document;
        }
    };
    private prevVisible: any;
    private clickOutsideHandler: any;
    private touchOutsideHandler: any;
    private contextMenuOutsideHandler1: any;
    private contextMenuOutsideHandler2: any;
    private mouseDownTimeout: any;
    private hasPopupMouseDown: any;
    private delayTimer: any;
    private _component: any;
    private containerRef: any;
    constructor(props: DropdownProps) {
        super(props);
        let visible;
        visible = !!props.defaultVisible;
        if ('visible' in props) {
            visible = !!props.visible;
        }
        this.prevVisible = visible;
        this.state = {
            visible
        };
    }
    componentDidMount() {
        this.componentDidUpdate({}, {
            visible: this.state.visible,
        });
    }
    componentWillReceiveProps(nextProps: DropdownProps) {
        const { visible } = nextProps;
        if (visible !== undefined) {
            this.setState({
                visible
            });
        }
    }
    componentDidUpdate(prevProps: DropdownProps, prevState: DropdownState) {
        const state = this.state;
        this.prevVisible = prevState.visible;
        if (state.visible) {
            let currentDocument;
            if (!this.clickOutsideHandler && (this.isClickToHide() || this.isContextMenuToShow())) {
                currentDocument = this.props.getDocument?.();
                this.clickOutsideHandler = EventEmit.bind(currentDocument, 'mousedown', this.onDocumentClick);
            }
            // always hide on mobile
            if (!this.touchOutsideHandler) {
                currentDocument = currentDocument || this.props.getDocument?.();
                this.touchOutsideHandler = EventEmit.bind(currentDocument, 'touchstart', this.onDocumentClick);
            }
            // close popup when trigger type contains 'onContextMenu' and document is scrolling.
            if (!this.contextMenuOutsideHandler1 && this.isContextMenuToShow()) {
                currentDocument = currentDocument || this.props.getDocument?.();
                this.contextMenuOutsideHandler1 = EventEmit.bind(currentDocument, 'scroll', this.onContextMenuClose);
            }
            // close popup when trigger type contains 'onContextMenu' and window is blur.
            if (!this.contextMenuOutsideHandler2 && this.isContextMenuToShow()) {
                this.contextMenuOutsideHandler2 = EventEmit.bind(window, 'blur', this.onContextMenuClose);
            }
            // if(listRoot) {
            //   Dldh.Css.addClass(listRoot, 'popup-contain-open-ative');
            //   Dldh.Css.removeClass(listRoot, 'popup-contain-hidden-ative');
            // }
            return;
        }
        // if(listRoot) {
        //   Dldh.Css.addClass(listRoot, 'popup-contain-hidden-ative');
        //   Dldh.Css.removeClass(listRoot, 'popup-contain-open-ative');
        // }
        this.clearOutsideHandler();
    }
    componentWillUnmount() {
        this.clearDelayTimer();
        this.clearOutsideHandler();
        clearTimeout(this.mouseDownTimeout);
    }
    clearOutsideHandler() {
        const props = this.props;
        let currentDocument;
        if (this.clickOutsideHandler) {
            currentDocument = props.getDocument?.();
            this.clickOutsideHandler = EventEmit.unbind(currentDocument, 'mousedown', this.onDocumentClick)
        }
        if (this.touchOutsideHandler) {
            currentDocument = currentDocument || props.getDocument?.();
            this.touchOutsideHandler = EventEmit.unbind(currentDocument, 'touchstart', this.onDocumentClick);
        }
        if (this.contextMenuOutsideHandler1) {
            currentDocument = currentDocument || props.getDocument?.();
            this.contextMenuOutsideHandler1 = EventEmit.unbind(currentDocument, 'scroll', this.onContextMenuClose);
        }
        if (this.contextMenuOutsideHandler2) {
            this.contextMenuOutsideHandler2 = EventEmit.unbind(window, 'blur', this.onContextMenuClose);
        }
    }
    onDocumentClick = (event: any) => {
        if (this.props.mask && !this.props.maskClosable) {
            return;
        }
        const target = event.target;
        const root: any = this.containerRef;
        if (!root.contains(target) && !this.hasPopupMouseDown) {
            this.setPopupVisible(false);
        }
    }
    onMouseEnter = (e: any) => {
        const { mouseEnterDelay } = this.props;
        this.delaySetPopupVisible(true, mouseEnterDelay, mouseEnterDelay ? null : e);
    }
    onMouseLeave = (e: any) => {
        this.delaySetPopupVisible(false, this.props.mouseLeaveDelay);
    }
    onClick = (e: any) => {
        e.preventDefault();
        const v = !this.state.visible;
        if (this.isClickToHide() && this.isClickToShow()) {
            this.setPopupVisible(v);
        }
    }
    onMouseDown = (e: any) => {
    }
    onTouchStart = (e: any) => {
    }
    onFocus = (e: any) => {
        this.clearDelayTimer();
        if (this.isFocusToShow()) {
            this.delaySetPopupVisible(true, this.props.focusDelay);
        }
    }
    onBlur = (e: any) => {
        this.clearDelayTimer();
        if (this.isBlurToHide()) {
            this.delaySetPopupVisible(false, this.props.blurDelay);
        }
    }
    onContextMenu = (e: any) => {
        e.preventDefault();
        console.log('onContextMenu');
        this.setPopupVisible(true);
    }
    onContextMenuClose = () => {
        if (this.isContextMenuToShow()) {
            this.setPopupVisible(false);
        }
    }
    getContainer = () => {
        const { props } = this;
        const popupContainer = document.createElement('div');
        popupContainer.className = `${props.sprefix}-popup`;
        const mountNode = props.getPopupContainer ? props.getPopupContainer(this.containerRef) : props.getDocument?.().body;
        mountNode.appendChild(popupContainer);
        return popupContainer;
    }
    handlePortalUpdate = (prevProps: DropdownProps, node: any) => {
        if (this.state.visible) {
            if (this.containerRef) {
                const target: any = this.containerRef;
                const listNode: any = node;
                listNode.style.width = this.props.width || target.offsetWidth + 'px';
                alignTo(listNode, target, this.props.placement);
            }
            
        }
        if (this.prevVisible !== this.state.visible) {
            this.props.afterPopupVisibleChange?.(this.state.visible);
        }
    }
    savePopup = (node: any) => {
        this._component = node;
    }
    clearDelayTimer() {
        if (this.delayTimer) {
            clearTimeout(this.delayTimer);
            this.delayTimer = null;
        }
    }
    delaySetPopupVisible(visible: boolean, delayS: number, event?: any) {
        const delay = delayS * 1000;
        this.clearDelayTimer();
        if (delay) {
            this.delayTimer = setTimeout(() => {
                this.setPopupVisible(visible);
                this.clearDelayTimer();
            }, delay);
        } else {
            this.setPopupVisible(visible);
        }
    }
    setPopupVisible(visible: boolean) {
        //const { alignPoint } = this.props;
        this.clearDelayTimer();
        if (this.state.visible !== visible) {
            if (!('visible' in this.props)) {
                this.setState({ visible });
            }
            this.props.onPopupVisibleChange?.(visible);
        }
    }
    onPopupMouseEnter = (e: any) => {
        this.clearDelayTimer();
    }
    onPopupMouseLeave = (e: any) => {
        //if (e.relatedTarget && !e.relatedTarget.setTimeout && this._component && this._component.getPopupDomNode && contains(this._component.getPopupDomNode(), e.relatedTarget)) {
        //return;
        //}
        this.delaySetPopupVisible(false, this.props.mouseLeaveDelay);
    }
    onPopupMouseDown = (e: any) => {
        this.hasPopupMouseDown = true;
        clearTimeout(this.mouseDownTimeout);
        this.mouseDownTimeout = setTimeout(() => {
            this.hasPopupMouseDown = false;
        }, 0);
    }

    isClickToShow() {
        const { trigger, showTrigger } = this.props;
        return trigger.indexOf('click') !== -1 || showTrigger.indexOf('click') !== -1;
    }
    isContextMenuToShow() {
        const { trigger, showTrigger } = this.props;
        return trigger.indexOf('contextMenu') !== -1 || showTrigger.indexOf('contextMenu') !== -1;
    }
    isClickToHide() {
        const { trigger, hideTrigger } = this.props;
        return trigger.indexOf('click') !== -1 || hideTrigger.indexOf('click') !== -1;
    }
    isMouseEnterToShow() {
        const { trigger, showTrigger } = this.props;
        return trigger.indexOf('hover') !== -1 || showTrigger.indexOf('mouseEnter') !== -1;
    }
    isMouseLeaveToHide() {
        const { trigger, hideTrigger } = this.props;
        return trigger.indexOf('hover') !== -1 || hideTrigger.indexOf('mouseLeave') !== -1;
    }
    isFocusToShow() {
        const { trigger, showTrigger } = this.props;
        return trigger.indexOf('focus') !== -1 || showTrigger.indexOf('focus') !== -1;
    }
    isBlurToHide() {
        const { trigger, hideTrigger } = this.props;
        return trigger.indexOf('blur') !== -1 || hideTrigger.indexOf('blur') !== -1;
    }
    renderChildren = (child: any) => {
        const newChildProps: any = {};
        if (this.isContextMenuToShow()) {
            newChildProps.onContextMenu = this.onContextMenu;
        }
        if (this.isClickToHide() || this.isClickToShow()) {
            newChildProps.onClick = this.onClick;
            newChildProps.onMouseDown = this.onMouseDown;
            newChildProps.onTouchStart = this.onTouchStart;
        }
        if (this.isMouseEnterToShow()) {
            newChildProps.onMouseEnter = this.onMouseEnter;
        }
        if (this.isMouseLeaveToHide()) {
            newChildProps.onMouseLeave = this.onMouseLeave;
        }
        if (this.isFocusToShow() || this.isBlurToHide()) {
            newChildProps.onFocus = this.onFocus;
            newChildProps.onBlur = this.onBlur;
        }
        return React.cloneElement(child, newChildProps);
    };
    render() {
        const { visible } = this.state;
        const popupProps: any = {
            sprefix: this.props.sprefix
        };
        if (this.isMouseEnterToShow()) {
            popupProps.onMouseEnter = this.onPopupMouseEnter;
        }
        if (this.isMouseLeaveToHide()) {
            popupProps.onMouseLeave = this.onPopupMouseLeave;
        }
        popupProps.onMouseDown = this.onPopupMouseDown;
        popupProps.onTouchStart = this.onPopupMouseDown;
        let popup;
        if (visible || this._component) {
            popup = (
                <Popup
                    {...popupProps}
                    visible={visible}
                    getContainer={this.getContainer}
                    didUpdate={this.handlePortalUpdate}
                    ref={this.savePopup}
                >
                    {this.props.menu}
                </Popup>
            );
        }
        return (
            <span ref={ ref => this.containerRef = ref }>
                <React.Fragment>
                    {
                        React.Children.map(
                            this.props.children,
                            (c) => this.renderChildren(c)
                        )
                    }
                    {popup}
                </React.Fragment>
            </span>
        );
    }
}
export default Dropdown;