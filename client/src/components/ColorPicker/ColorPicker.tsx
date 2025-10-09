import React, { Component } from 'react';
import ReactDOM, { findDOMNode, createPortal } from 'react-dom';
import { Dropdown } from './Dropdown';
import ColorPanel from './ColorPanel';
import './colorPicker.less';

interface ColorPickerProps {
    sprefix?: string;
    defaultVisible?: boolean;
    visible?: boolean;
    defaultValue?: string;
    value?: string;
    className?: string;
    onChange?: Function
}

interface ColorPickerState {
    value: string;
    visible: boolean;
}

class ColorPicker extends Component<ColorPickerProps, ColorPickerState> {
    static defaultProps = {
        sprefix: 'dwrui'
    };
    constructor(props: ColorPickerProps) {
        super(props);
        let value = props.value || props.defaultValue || 'rgba(255,255,255,1)';
        let visible = props.visible || props.defaultVisible || false;
        this.state = {
            visible,
            value
        }
    }
    componentDidMount() {
    }
    componentWillReceiveProps(nextProps: ColorPickerProps) {
        if('value' in nextProps) {
            const { value } = nextProps;
            if(value !== this.state.value) {
                this.setState({
                    value: value || 'rgba(255,255,255,1)'
                });
            }
        }
        if('visible' in nextProps) {
            const { visible } = nextProps;
            if(visible !== this.state.visible) {
                this.setState({
                    visible: visible || false
                });
            }
        }
    }
    onPopupVisibleChange = (visible: boolean) => {
        this.setState({
            visible
        });
    };
    onChange = (v: any, json: any) => {
        const props = this.props;
        const { value } = this.state;
        if(v !== value) {
            if(!('value' in props)) {
                this.setState({
                    value: v
                });
                //this.onPopupVisibleChange(false);
            }
            props.onChange?.(v, json);
        }
    }
    render() {
        const { value, visible } = this.state;
        const { sprefix, className } = this.props;
        const cls = [`${ sprefix }-colorPicker-wrap`];
        if (className) {
            cls.push(className);
        }
        return (
            <Dropdown
                menu={
                    <ColorPanel
                        value={ value }
                        onChange={ this.onChange }
                    ></ColorPanel>
                }
                width={ 'auto' }
                visible={ visible }
                onPopupVisibleChange={ this.onPopupVisibleChange }
                trigger={ "click" }
            >
                <div className={ ` ${ cls.join(' ') }` }>
                    <div className={ `${ sprefix }-colorPicker-content-bg` }>
                        <div className={ `${ sprefix }-colorPicker-content` } style={{ background: value }}></div>
                    </div>
                    <div className={ `${ sprefix }-colorPicker-input-wrap` }>
                        <input className={ `${ sprefix }-colorPicker-input` } type="text"/>
                    </div>
                    <i className={ `${ sprefix }-colorPicker-arrow-icon` }></i>
                </div>
            </Dropdown>
        );
    }
}

export default ColorPicker;