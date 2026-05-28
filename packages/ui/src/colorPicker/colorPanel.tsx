import React, { Component } from 'react';
import {
    getParsedGradient,
    getRgba,
    rgbToHex,
    rgbaToHsv,
    hsvToRgb,
    hexToRgba,
    getHueAndPosByHsv,
    validApacity,
    validRgba,
    validHex,
    rgbaToString
} from './color';
import { CLASSNAME } from '../config';
import './colorPanel.less';

const COLORTYPES = [
    {
        label: 'Normal',
        name: 'normal'
    },
    {
        label: 'Linear',
        name: 'linear-gradient'
    },
    {
        label: 'Radial',
        name: 'radial-gradient'
    }
];

const ANGLE_TYPES: any = {
    'to top': 0,
    'to top right': 45,
    'to right': 90,
    'to bottom right': 135,
    'to bottom': 180,
    'to bottom left': 225,
    'to left': 270,
    'to top left': 315,
    'radial': 180
    //'radial': 'at center center'
};

const getPosition = (e: any) => {
    const obj = 'touches' in e ? e.touches[0] : e;
    return {
        pageX: obj.pageX,
        pageY: obj.pageY
    };
}

interface PosProps {
    x: number;
    y: number;
}

// interface RGBAProps {
//     r: number;
//     g: number;
//     b: number;
//     a: number;
// }

interface ColorPanelProps {
    defaultValue?: string;
    value?: string;
    className?: string;
    // type?: string;
    colors?: Array<any>;
    onChange?: Function;
}
interface ColorPanelState {
    type: string;
    hex: string;
    hexStr: string;
    rgba: any;
    r: any;
    g: any;
    b: any;
    a: any;
    hue: any;
    pos: PosProps;
    angle: any;
}
class ColorPanel extends Component<ColorPanelProps, ColorPanelState> {
    static defaultProps = {
        // type: 'gradient',
        colors: [
            "#ffffff", "#fafafa", "#f5f5f5", "#e8e8e8", "#d9d9d9", "#bfbfbf", "#8c8c8c", "#595959", "#262626", "#000000",
            "#e5f7ff", "#b8e7ff", "#8ed4ff", "#65bfff", "#39a7ff", "#008dff", "#006adc", "#004db6", "#00378e", "#002568",
            "#e8f5e9", "#c8e6c9", "#a5d6a7", "#81c783", "#66bb6a", "#4caf50", "#42a047", "#388e3c", "#2f7d32", "#1b5e20",
            "#fffbe5", "#fff2b5", "#ffe689", "#ffd75c", "#ffc627", "#fcae00", "#d68900", "#ae6900", "#884d00", "#623400",
            "#fff1f0", "#ffccc6", "#ffa39c", "#ff7772", "#ff4b49", "#f81d22", "#d10d18", "#aa0212", "#84000f", "#5d000f",
            "#f3e5f5", "#e1bee7", "#ce93d8", "#ba68c8", "#ab47bc", "#9c26b0", "#8e24aa", "#7b1fa2", "#6a1b9a", "#4a148c"
        ]
    };
    private gradientSliderBar: any;
    private panel: any;
    private isMove: boolean = false;
    // private values: any = {
    //     'normal': 'rgba(255,255,255,1)',
    //     'linear-gradient': 'linear-gradient(rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)',
    //     'radial-gradient': 'radial-gradient(at center center, rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)'
    // };
    // private drag: any = {
    //     'linear-gradient': 0,
    //     'radial-gradient': 0
    // };
    private dragStartX = 0;
    //private dragStartY = 0;
    private dragEndX = 0;
    //private dragEndY = 0;
    private isDragMove = true;
    private action: any = '';
    private values: any = {};
    private drag: any = {};
    constructor(props: ColorPanelProps) {
        super(props);
        const value = props.value || props.defaultValue || 'rgba(255,255,255,1)';
        const {
            type, 
            hex,
            hexStr,
            rgba,
            hue,
            pos,
            values,
            drag,
            angle
        } = this.getStateByValue(value);
        this.values = values;
        this.drag = drag;
        this.state = {
            type, 
            hex,
            hexStr,
            rgba,
            ...rgba,
            hue,
            pos,
            angle
        };

    }
    componentDidMount() {
        const hsv = rgbaToHsv(this.state.rgba);
        const rect = this.panel.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const { pos } = getHueAndPosByHsv(hsv, width, height);
        this.setState({
            pos
        });
    }
    componentWillReceiveProps(nextProps: ColorPanelProps) {
        if('value' in nextProps) {
            if (this.action) {
                this.action = '';
                // const {
                //     // values,
                //     type, 
                //     // hex,
                //     // hexStr,
                //     // rgba,
                //     // hue,
                //     // pos,
                //     // angle
                // } = this.getStateByValue(nextProps.value || 'rgba(255,255,255,1)');
                // this.setState({
                //     type
                // });
            } else {
                // if(nextProps.value !== this.state.value) {
                    const {
                        values,
                        type, 
                        hex,
                        hexStr,
                        rgba,
                        hue,
                        pos,
                        angle
                    } = this.getStateByValue(nextProps.value || 'rgba(255,255,255,1)');
                    this.values[type] = values[type];
                    this.drag[type] = 0;
                    this.setState({
                        type, 
                        hex,
                        hexStr,
                        rgba,
                        ...rgba,
                        hue,
                        pos,
                        angle
                    });
                // }
            }
        }
    }
    componentDidUpdate() {

    }
    componentWillMount() {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        document.removeEventListener('touchmove', this.handleMouseMove);
        document.removeEventListener('touchend', this.handleMouseUp);

        document.removeEventListener('mousemove', this.handleMouseMoveDrag);
        document.removeEventListener('mouseup', this.handleMouseUpDrag);

        document.removeEventListener('touchmove', this.handleMouseMoveDrag);
        document.removeEventListener('touchend', this.handleMouseUpDrag);
    }
    getStateByValue(value: string) {
        const { 
            type,
            color,
            angle,
            values,
            gradient
        } = this.getColor(value);
        const rgba = getRgba(color);
        const hex = rgbToHex(rgba);
        const hsv = rgbaToHsv(rgba);
        let width = 0;
        let height = 0;
        if (this.panel) {
            const rect = this.panel.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
        }
        const { hue, pos } = getHueAndPosByHsv(hsv, width, height);
        let newGradient = gradient;
        if(!newGradient || !newGradient.length) {
            newGradient = [{
                pos: {
                    x: 0,
                    y: 0
                },
                value: '#FFFFFF'
            }, {
                pos: {
                    x: 100,
                    y: 0
                },
                value: '#000000'                    
            }];
        };
        return {
            type,
            hex,
            hexStr: hex,
            rgba,
            hue,
            pos,
            color,
            angle,
            gradient: newGradient,
            drag: {
                'linear-gradient': 0,
                'radial-gradient': 0
            },
            values
        };
    }
    getColor(value: any) {
        const colorParse: any = getParsedGradient(value);
        let colorItem: any;
        let type: string;
        let color: string;
        let angle: any;
        const values: any = {
            'normal': '#FFFFFF',
            'linear-gradient': 'linear-gradient(rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)',
            'radial-gradient': 'radial-gradient(at center center, rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)'
        };
        const gradient: Array<any> = [];
        if (colorParse && colorParse.length > 0) {
            colorItem = colorParse[0];
            angle = colorItem.direction;
            const colors = colorItem.colors || [];
            (colorItem.colors || []).forEach((item: any) => {
                gradient.push({
                    pos: {
                        x: parseFloat(item.pos),
                        y: 0
                    },
                    value: item.color
                });
            });
            type = colorItem.type;
            color = colors[0].color;
        } else {
            type = 'normal';
            color = value;
        }
        if (angle === undefined) {
            angle = 180;
        } else {
            angle = this.getAngle(angle);
        }
        values[type] = value;
        return {
            type,
            color: color === 'transparent' ? 'rgba(0,0,0,0)' : color,
            angle,
            values,
            gradient
        };
    }
    setPos(xy: PosProps) {
        const { rgba, hue, pos } = this.state;
        const rect = this.panel.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        let left = xy.x - rect.left - (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0);
        let top = xy.y - rect.top - (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
        left = Math.max(0, left);
        left = Math.min(left, width);
        top = Math.max(0, top);
        top = Math.min(top, height);
        if (left !== pos.x || top !== pos.y) {
            const s = left * 100 / width;
            const v = (height - top) * 100 / height;
            const newRgba: any = hsvToRgb(hue, s, v);
            const hex = rgbToHex(newRgba);
            newRgba.a = rgba.a;

            const newState = {
                hue,
                rgba: newRgba,
                ...newRgba,
                hex,
                hexStr: hex,
                pos: {
                    x: left,
                    y: top
                }
            };

            this.doUpdate(newState);
        }
    }
    handleAddDrag = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        if (e.target === this.gradientSliderBar) {
            const pos = getPosition(e);
            const rect = this.gradientSliderBar.getBoundingClientRect();
            let left = pos.pageX - rect.left - (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0);
            //let top = pos.pageY - rect.top - (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
            left = Math.max(0, left);
            left = Math.min(left, rect.width);
            left = left * 100 / rect.width;

            const { type, angle } = this.state;
            const { gradient } = this.getColor(this.values[type]), defaultColor = '#FFFFFF';
            gradient.push({
                pos: {
                    x: left,
                    y: 0
                },
                value: defaultColor
            });
            gradient.sort((a: any, b: any) => {
                return Number(a.pos.x) - Number(b.pos.x);
            });
            let index;
            for(let i = 0; i < gradient.length; i++) {
                if(gradient[i].pos.x === left) {
                    index = i;
                    break;
                }
            }
            const params = this.getStateByValue(defaultColor);
            const newState = {
                // ...this.state,
                type,
                hex: params.hex,
                hexStr: params.hex,
                hue: params.hue,
                rgba: params.rgba,
                ...params.rgba,
                pos: params.pos
            };
            this.drag[type] = index;
            this.values[type] = this.toColor({
                type,
                angle,
                rgba: newState.rgba
            }, gradient);

            console.log('params', params);

            this.doUpdate(newState);
        }
    }
    handleMouseDown = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        const pos = getPosition(e);
        this.isMove = true;
        this.setPos({
            x: pos.pageX,
            y: pos.pageY
        });
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        document.addEventListener('touchmove', this.handleMouseMove);
        document.addEventListener('touchend', this.handleMouseUp);
    }
    handleMouseMove = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        if (this.isMove) {
            const pos = getPosition(e);
            this.setPos({
                x: pos.pageX,
                y: pos.pageY
            });
        }
    };
    handleMouseUp = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        this.isMove = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        document.removeEventListener('touchmove', this.handleMouseMove);
        document.removeEventListener('touchend', this.handleMouseUp);
    };
    handleAngle = (e: any) => {
        e.preventDefault();
        const angle = e.target.value;
        this.doUpdate({
            angle
        });
    }
    handleArea = (e: any) => {
        e.preventDefault();
        const { pos, rgba } = this.state;
        const rect = this.panel.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        let hue = parseInt(e.target.value, 10);
        let s = pos.x * 100 / width;
        let v = (height - pos.y) * 100 / height;

        let newRgba: any = hsvToRgb(hue, s, v);
        let hex = rgbToHex(newRgba);
        newRgba.a = rgba.a;

        const newState = {
            hue,
            rgba: newRgba,
            ...newRgba,
            hex,
            hexStr: hex
        };

        this.doUpdate(newState);
    }
    handleAlpha = (e: any) => {
        e.preventDefault();
        const { rgba } = this.state;

        const alpha = parseFloat(e.target.value);

        const newRgba = {
            ...rgba,
            a: alpha
        };

        const newState = {
            rgba: newRgba,
            ...newRgba
        };

        this.doUpdate(newState);
    }
    handleHexPress = (e: any) => {
        if (e.nativeEvent.which === 13) {
            e.target.blur();
        }
    }
    handleHexBlur = (e: any) => {
        e.preventDefault();
        const { hex, hexStr, a } = this.state;
        if (hex === hexStr) {
            return;
        }
        if (validHex(hexStr)) {

            const newRgba: any = hexToRgba(hexStr);
            const newHex = rgbToHex(newRgba);
            newRgba.a = a;
            const rect = this.panel.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            let hsv = rgbaToHsv(newRgba);
            const hue = hsv.h;
            const left = hsv.s * width / 100;
            const top = (100 - hsv.v) * height / 100;

            const newState = {
                hue,
                pos: {
                    x: left,
                    y: top
                },
                rgba: newRgba,
                ...newRgba,
                hex: newHex,
                hexStr: newHex
            };

            this.doUpdate(newState);
        } else {
            this.setState({
                hexStr: hex
            });
        }
    }
    handleHexChange = (e: any) => {
        e.preventDefault();
        // if (!('value' in this.props)) {
            this.setState({
                hexStr: e.target.value
            });
        // }
    }

    handleRgbaPress = (e: any) => {
        if (e.nativeEvent.which === 13) {
            e.target.blur();
        }
    }
    handleRgbaBlur = (type: string) => {
        return (e: any) => {
            e.preventDefault();
            const state: any = this.state;
            const { rgba } = this.state;
            if (rgba[type] === state[type]) {
                return;
            }
            if (type === 'a') {
                const is = validApacity(state[type]);
                if (is !== false) {
                    const newRgba = {
                        ...rgba,
                        a: parseFloat(e.target.value)
                    };

                    const newState = {
                        rgba: newRgba,
                        ...newRgba
                    };

                    this.doUpdate(newState);
                } else {
                    this.setState({
                        a: rgba.a
                    });
                }
            } else {
                const is = validRgba(state[type]);
                if (is !== false) {
                    const newRgba = {
                        ...rgba,
                    };
                    newRgba[type] = parseFloat(state[type]);
                    const hsv = rgbaToHsv(newRgba);
                    const rect = this.panel.getBoundingClientRect();
                    const width = rect.width;
                    const height = rect.height;
                    const hue = hsv.h;
                    const left = hsv.s * width / 100;
                    const top = (100 - hsv.v) * height / 100;
                    const hex = rgbToHex(newRgba);

                    const newState = {
                        hue,
                        pos: {
                            x: left,
                            y: top,
                        },
                        rgba: newRgba,
                        ...newRgba,
                        hex,
                        hexStr: hex
                    };

                    this.doUpdate(newState);
                } else {
                    const newParams: any = {
                        [type]: rgba[type]
                    };
                    this.setState(newParams);
                }
            }
        }
    }
    handleRgbaChange = (type: string) => {
        return (e: any) => {
            e.preventDefault();
            const newParams: any = {
                [type]: e.target.value
            };
            this.setState(newParams);
        }
    }
    handleTypeClick = (type: string) => {
        return (e: any) => {
            e.preventDefault();
            let params: any;
            if (type !== this.state.type) {
                if(type === 'linear-gradient' || type === 'radial-gradient') {
                    const { gradient } = this.getColor(this.values[type]);
                    params = this.getStateByValue(gradient[this.drag[type]].value);
                } else {
                    params = this.getStateByValue(this.values[type]);
                }
                this.doUpdate({
                    type,
                    hex: params.hex,
                    hexStr: params.hexStr,
                    rgba: params.rgba,
                    ...params.rgba,
                    hue: params.hue,
                    pos: params.pos,
                    color: params.color
                    // angle: params.angle
                });
            }
        }
    }
    handleColorClick = (color: string) => {
        return (e: any) => {
            e.preventDefault();
            const {
                // type, 
                hex,
                hexStr,
                rgba,
                hue,
                pos
            } = this.getStateByValue(color);

            const newState = {
                // type, 
                hex,
                hexStr,
                rgba,
                ...rgba,
                hue,
                pos
            };

            this.doUpdate(newState);
        }
    }
    handleDoubleClickDrag = (index: number) => {
        return (e: any) => {
            if (!('touches' in e)) {
                e.preventDefault?.();
            }
            const { type, angle } = this.state;
            const { gradient } = this.getStateByValue(this.values[type]);
            if(gradient.length <= 2) {
                return;
            }
            gradient.splice(index, 1);
            const newIndex = index > gradient.length - 1 ? gradient.length - 1 : index;
            const { 
                hex,
                hexStr,
                rgba,
                hue,
                pos 
            } = this.getStateByValue(gradient[newIndex].value);
            const newState = {
                hex,
                hexStr,
                rgba,
                ...rgba,
                hue,
                pos 
            };
            this.values[type] = this.toColor({
                type,
                angle,
                rgba
            }, gradient);
            this.doUpdate(newState);
        };
    };
    handleMouseDownDrag = (index: number) => {
        return (e: any) => {
            if (!('touches' in e)) {
                e.preventDefault?.();
            }
            const pos = getPosition(e);
            this.dragStartX = pos.pageX;
            //this.dragStartY = pos.pageY;
            this.isDragMove = true;
            document.addEventListener('mousemove', this.handleMouseMoveDrag);
            document.addEventListener('mouseup', this.handleMouseUpDrag);
            const { type } = this.state;
            if(index === this.drag[type]) {
                return;
            }
            const { gradient } = this.getColor(this.values[type]);
            const params = this.getStateByValue(gradient[index].value);
            this.drag[type] = index;
            this.doUpdate({
                type,
                hex: params.hex,
                hexStr: params.hexStr,
                rgba: params.rgba,
                hue: params.hue,
                pos: params.pos,
                color: params.color,
                angle: params.angle
            });
        };
    }
    handleMouseMoveDrag = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        const pos = getPosition(e);
        this.dragEndX = pos.pageX;
        // this.dragEndY = pos.pageY;
        if (this.isDragMove && (this.dragEndX - this.dragStartX !== 0)) {
            let x = this.dragEndX;
            //let y = this.dragEndY;
            let rect = this.gradientSliderBar.getBoundingClientRect();
            let left = x - rect.left - (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0);
            //let top = y - rect.top - (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
            left = Math.max(0, left);
            left = Math.min(left, rect.width);
            //top = Math.max(0, top);
            //top = Math.min(top, rect.height);
            const { type, angle } = this.state;
            const { gradient, rgba } = this.getStateByValue(this.values[type]);
            gradient[this.drag[type]].pos.x = Math.floor(left * 100 / rect.width);
            this.values[type] = this.toColor({
                type,
                rgba,
                angle
            }, gradient);
            this.doUpdate({
                ...this.state
            });
        }
    }
    handleMouseUpDrag = (e: any) => {
        if (!('touches' in e)) {
            e.preventDefault?.();
        }
        this.isDragMove = false;
        document.removeEventListener('mousemove', this.handleMouseMoveDrag);
        document.removeEventListener('mouseup', this.handleMouseUpDrag);
    }
    getAngle(angle: any) {
        return ANGLE_TYPES[angle] !== undefined ? ANGLE_TYPES[angle] : angle;
    }
    toColor({
        type,
        rgba,
        angle
    }: any, gradient: Array<any> = []) {
        if (type === 'normal') {
            return rgbaToString(rgba);
        } else {
            // const { gradient } = this.getColor(this.values[type]);
            if(rgba && gradient[this.drag[type]]) {
                gradient[this.drag[type]].value = rgbaToString(rgba);
            }
            const gradientItems: Array<any> = [];
            // gradient.sort((a, b) => {
            //     return Number(a.pos.x) - Number(b.pos.x);
            // });
            gradient.forEach(item => {
                gradientItems.push(`${ item.value } ${ item.pos.x }%`);
            });
            if (type === 'linear-gradient') {
                if (angle !== '' && !isNaN(angle)) {
                    gradientItems.unshift(`${ this.getAngle(angle) }deg`);
                }
            }
            return type === 'linear-gradient' ? `linear-gradient(${ gradientItems.join(',') })` : `radial-gradient(at center center,${ gradientItems.join(',') })`;
        }
    }
    doUpdate(updateState: any) {
        const newState = {
            ...this.state,
            ...updateState
            // ...updateState.rgba
        };
        const { gradient, angle } = this.getColor(this.values[newState.type]);
        this.values[newState.type] = this.toColor({
            type: newState.type,
            rgba: newState.rgba,
            angle: newState.angle
        }, gradient);

        this.action = 'doUpdate';

        // console.log('values', this.values);
        // if (!('value' in this.props)) {
            this.setState(newState);
        // }
        this.props.onChange?.(this.values[newState.type], {
            type: newState.type,
            value: newState.type === 'normal' ? newState.rgba : gradient,
            angle: newState.type === 'linear-gradient' ? newState.angle : undefined
        });
    }
    renderHeader() {
        const { type } = this.state;
        return (
            <div className={`${CLASSNAME}-colorPanel-tabs`}>
                {
                    COLORTYPES.map((item: any, index: number) => {
                        const cls = [`${CLASSNAME}-colorPanel-tab`];
                        if (type === item.name) {
                            cls.push(`${CLASSNAME}-colorPanel-tab-active`);
                        }
                        return (
                            <div 
                                key={ index }
                                className={ cls.join(' ') }
                                onClick={ this.handleTypeClick(item.name) }
                            >{item.label}</div>
                        );
                    })
                }
            </div>
        );
    }
    renderGlobalColors() {
        const { colors } = this.props;
        return colors?.map((item: any, index: number) => {
            return (
                <div 
                    key={ index }
                    className={ `${ CLASSNAME }-colorPanel-colors-item` }
                    onClick={ this.handleColorClick(item) }
                >
                    <div 
                        className={ `${ CLASSNAME }-colorPanel-colors-color` }
                        style={{ backgroundColor: item }}
                    ></div>
                </div>
            );
        });
    }
    renderInput(type: string, label: string) {
        const state: any = this.state;
        return (
            <div className={`${CLASSNAME}-colorPanel-rgba`}>
                <input
                    className={`${CLASSNAME}-colorPanel-input`}
                    type="text"
                    value={state[type]}
                    onKeyPress={this.handleRgbaPress}
                    onBlur={this.handleRgbaBlur(type)}
                    onChange={this.handleRgbaChange(type)}
                />
                <div className={`${CLASSNAME}-colorPanel-label`}>{label}</div>
            </div>
        );
    }
    renderGradientBar(gradient: Array<any> = []) {
        const { type } = this.state;
        return gradient.map((item: any, index: number) => {
            const cls: Array<string> = [`${ CLASSNAME }-colorPanel-gradient-slider-drag`];
            if (this.drag[type] === index) {
                cls.push(`${ CLASSNAME }-colorPanel-gradient-slider-drag-selected`);
            }
            return (
                <div
                    key={ index }
                    className={ cls.join(' ') }
                    style={{
                        left: `${ item.pos.x * 235 / 100 }px`,
                        top: `${ item.pos.y }px`
                    }}
                    onMouseDown={ this.handleMouseDownDrag(index) }
                    onTouchStart={ this.handleMouseDownDrag(index) }
                    onDoubleClick={ this.handleDoubleClickDrag(index) }
                >
                    <div className={ `${ CLASSNAME }-colorPanel-gradient-slider-pointer` }></div>
                    <div className={ `${ CLASSNAME }-colorPanel-gradient-slider-body` }>
                        <div
                            className={ `${ CLASSNAME }-colorPanel-gradient-slider-body-inner` }
                            style={{
                                background: item.value
                            }}
                        ></div>
                    </div>
                </div>
            );
        });

    }
    render() {
        const { className } = this.props;
        const { type, hue, rgba, pos, hexStr, angle } = this.state;
        const cls = [
            `${CLASSNAME}-colorPanel`,
            // `${CLASSNAME}-${type}-colorPanel`
        ];
        if (className) {
            cls.push(className);
        }
        const hueColor = hsvToRgb(hue, 100, 100);
        // const prviewBg = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;

        const prviewBg = this.values[type];

        let gradientBar: any = null;
        let gradientBarBg: any = null;

        if (type === 'linear-gradient' || type === 'radial-gradient') {
            // console.log('gradientItems', this.values[type]);
            const { gradient } = this.getColor(this.values[type]);
            const gradientItems: Array<any> = [];
            // gradient.sort((a, b) => {
            //     return Number(a.pos.x) - Number(b.pos.x);
            // });
            gradient.forEach((item: any) => {
                gradientItems.push(`${ item.value } ${ item.pos.x }%`);
            });  
            gradientBarBg = `linear-gradient(to right,${ gradientItems.join(',') })`;
            gradientBar = this.renderGradientBar(gradient);
        }

        return (
            <div className={cls.join(' ')}>
                <div className={`${CLASSNAME}-colorPanel-header`}>
                    {this.renderHeader()}
                </div>
                <div className={`${CLASSNAME}-colorPanel-center`}>
                    <div className={`${CLASSNAME}-colorPanel-gradient ${CLASSNAME}-colorPanel-${type}`}>
                        <div className={`${CLASSNAME}-colorPanel-gradient-bar-bg`}>
                            <div
                                className={`${CLASSNAME}-colorPanel-gradient-bar`}
                                style={{ background: gradientBarBg }}
                            ></div>
                        </div>
                        <div
                            className={`${CLASSNAME}-colorPanel-gradient-slider-bar`}
                            ref={(ref) => this.gradientSliderBar = ref}
                            onMouseDown={this.handleAddDrag}
                        >
                            { gradientBar }
                        </div>
                        <div className={`${CLASSNAME}-colorPanel-gradient-angle-wrap`}>
                            <input
                                className={`${CLASSNAME}-colorPanel-range ${CLASSNAME}-colorPanel-gradient-angle`}
                                type="range"
                                min="0"
                                max="360"
                                title={ angle }
                                value={ angle }
                                onChange={ this.handleAngle }
                            />
                            <span className={`${CLASSNAME}-colorPanel-gradient-angle-label`}>{ angle }</span>
                            <div
                                className={`${CLASSNAME}-colorPanel-gradient-angle-list`}
                                style={{ display: 'none' }}
                            >
                                <span className={`${CLASSNAME}-colorPanel-gradient-angle-item`}>0</span>
                                <span className={`${CLASSNAME}-colorPanel-gradient-angle-item`}>
                                    <input className={`${CLASSNAME}-colorPanel-input ${CLASSNAME}-colorPanel-gradient-angle-input`} type="text" />
                                </span>
                                <span className={`${CLASSNAME}-colorPanel-gradient-angle-item`}>360</span>
                            </div>
                        </div>
                    </div>
                    <div className={`${CLASSNAME}-colorPanel-center-inner`}>
                        <div
                            className={`${CLASSNAME}-colorPanel-panel`}
                            ref={(ref) => this.panel = ref}
                            onMouseDown={this.handleMouseDown}
                            onTouchStart={this.handleMouseDown}
                        >
                            <div
                                className={`${CLASSNAME}-colorPanel-hue`}
                                style={{ backgroundColor: `rgb(${hueColor.r},${hueColor.g},${hueColor.b})` }}
                            >
                                <div className={`${CLASSNAME}-colorPanel-saturation`}>
                                    <div className={`${CLASSNAME}-colorPanel-brightness`}></div>
                                </div>
                            </div>
                            <div
                                className={`${CLASSNAME}-colorPanel-pointer`}
                                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                                // ref={(ref) => this.pointer = ref}
                            ></div>
                        </div>
                        <div className={`${CLASSNAME}-colorPanel-fixed`}>
                            <div className={`${CLASSNAME}-colorPanel-left`}>
                                <div className={`${CLASSNAME}-colorPanel-area-slider-bg`}>
                                    <input
                                        className={`${CLASSNAME}-colorPanel-range ${CLASSNAME}-colorPanel-area-slider`}
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={hue}
                                        onChange={this.handleArea}
                                    />
                                </div>
                                <div className={`${CLASSNAME}-colorPanel-alpha-slider-bg`}>
                                    <input
                                        className={`${CLASSNAME}-colorPanel-range ${CLASSNAME}-colorPanel-alpha-slider`}
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={rgba.a}
                                        onChange={this.handleAlpha}
                                        style={{
                                            background: `linear-gradient(90deg, rgba(${rgba.r},${rgba.g},${rgba.b},0), rgba(${rgba.r},${rgba.g},${rgba.b},1))`
                                        }}
                                    // style={{
                                    //     background: `linear-gradient(90deg, rgba(${ color.rgba.r },${ color.rgba.g },${ color.rgba.b },0), rgba(${ color.rgba.r },${ color.rgba.g },${ color.rgba.b },1)), url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGUlEQVQYV2M4gwH+YwCGIasIUwhT25BVBADtzYNYrHvv4gAAAABJRU5ErkJggg==)`
                                    // }}
                                    />
                                </div>
                            </div>
                            <div className={`${CLASSNAME}-colorPanel-right`}>
                                <div className={`${CLASSNAME}-colorPanel-preview-bg`}>
                                    <div
                                        className={`${CLASSNAME}-colorPanel-preview`}
                                        style={{ background: prviewBg }}
                                    ></div>
                                    {/* <div className={ `${ CLASSNAME }-colorPanel-gradient-preview` } style={{ background: prviewBg }}></div> */}
                                </div>
                            </div>
                        </div>
                        <div className={`${CLASSNAME}-colorPanel-color-panel`} >
                            <div className={`${CLASSNAME}-colorPanel-hex-wrap`} >
                                <span className={`${CLASSNAME}-colorPanel-hex-label`} >#</span>
                                <input
                                    className={`${CLASSNAME}-colorPanel-input`}
                                    value={hexStr}
                                    maxLength={6}
                                    type="text"
                                    onKeyPress={this.handleHexPress}
                                    onBlur={this.handleHexBlur}
                                    onChange={this.handleHexChange}
                                />
                                <div className={`${CLASSNAME}-colorPanel-label`} >HEX</div>
                            </div>
                            <div className={`${CLASSNAME}-colorPanel-rgba-wrap`} >
                                {this.renderInput('r', 'R')}
                                {this.renderInput('g', 'G')}
                                {this.renderInput('b', 'B')}
                                {this.renderInput('a', 'A')}
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`${CLASSNAME}-colorPanel-footer`}>
                    <div className={`${CLASSNAME}-colorPanel-global`}>
                        <input className={`${CLASSNAME}-colorPanel-chk`} defaultChecked type="checkbox" />
                        <div className={`${CLASSNAME}-colorPanel-arrow-wrap`}>
                            <span className={`${CLASSNAME}-colorPanel-arrow`}>
                                <svg viewBox="0 0 1024 1024" focusable="false" data-icon="caret-down" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                    <path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>
                                </svg>
                            </span>
                            <span className={`${CLASSNAME}-colorPanel-nav-label`}>Global Colors</span>
                        </div>
                        <div className={`${CLASSNAME}-colorPanel-list ${CLASSNAME}-colorPanel-colors`}>
                            {this.renderGlobalColors()}
                        </div>
                    </div>
                    {/* <div className={`${CLASSNAME}-colorPanel-recent`}>
                        <input className={`${CLASSNAME}-colorPanel-chk`} type="checkbox" />
                        <div className={`${CLASSNAME}-colorPanel-arrow-wrap`}>
                            <span className={`${CLASSNAME}-colorPanel-arrow`}>
                                <svg viewBox="0 0 1024 1024" focusable="false" data-icon="caret-down" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                    <path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>
                                </svg>
                            </span>
                            <span className={`${CLASSNAME}-colorPanel-nav-label`}>Recent Colors</span>
                        </div>
                        <div className={`${CLASSNAME}-colorPanel-list`}></div>
                    </div> */}
                </div>
                <input className={`${CLASSNAME}-colorPanel-hidden`} type="hidden" />
            </div>
        );
    }
}


export default ColorPanel;