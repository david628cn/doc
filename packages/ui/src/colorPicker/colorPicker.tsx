import React, { Component } from 'react';
import { Dropdown } from './dropdown';
import ColorPanel from './colorPanel';
import { CLASSNAME } from '../config';
import './colorPicker.less';

interface ColorPickerProps {
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
        const { className } = this.props;
        const cls = [`${ CLASSNAME }-colorPicker-wrap`];
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
                    <div className={ `${ CLASSNAME }-colorPicker-content-bg` }>
                        <div className={ `${ CLASSNAME }-colorPicker-content` } style={{ background: value }}></div>
                    </div>
                    <div className={ `${ CLASSNAME }-colorPicker-input-wrap` }>
                        <input className={ `${ CLASSNAME }-colorPicker-input` } type="text"/>
                    </div>
                    <i className={ `${ CLASSNAME }-colorPicker-arrow-icon` }></i>
                </div>
            </Dropdown>
        );
    }
}

export default ColorPicker;