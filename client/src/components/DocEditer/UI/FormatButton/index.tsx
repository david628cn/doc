import { useEffect, useState } from 'react';
import {
    Button,
    Tooltip
} from 'antd';
import './index.less';

interface FormatButtonProps {
    title?: string;
    className?: string;
    active?: boolean;
    children?: any;
    onClick?: Function;
    [key: string]: unknown
}

const FormatButton = (props: FormatButtonProps) => {
    const { className, title, active, children, onClick, ...otherProps } = props;
    const [open, setOpen] = useState(false);
    // const [active, setActive] = useState(props.active);

    // useEffect(() => {
    //     setActive(props.active);
    // }, [props.active]);

    const handlePointerDown = (e: any) => {
        e.preventDefault();
    }

    const handleClick = (e: any) => {
        e.preventDefault();
        setOpen(false);
        onClick?.(e);
    }

    const handleMouseOver = (e: any) => {
        e.preventDefault();
        if (e.target.classList.contains('ant-dropdown-open')) {
            setOpen(false);
        } else {
            setOpen(true);
        }
    }

    const handleMouseLeave = (e: any) => {
        e.preventDefault();
        setOpen(false);
    }

    let cls: any = ['docEditer-formatButton-button'];
    if (className !== undefined) {
        cls.push(className);
    }
    if (active) {
        cls.push('docEditer-formatButton-button-active');
    }
    cls = cls.join(' ');

    if (title === undefined) {
        return (
            <Button
                className={ cls }
                type="text"
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                { ...otherProps }
                onMouseEnter={handleMouseOver}
                onMouseLeave={handleMouseLeave}
            >
                { children }
            </Button>
        )
    }

    return (
        <Tooltip open={open} title={title} overlayClassName="docEditer-formatButton-tooltip">
            <Button
                className={ cls }
                type="text"
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                { ...otherProps }
                onMouseEnter={handleMouseOver}
                onMouseLeave={handleMouseLeave}
            >
                { children }
            </Button>
        </Tooltip>
    )
}

interface FormatButtonGroupProps {
    className?: string;
    children?: any;
    [key: string]: unknown
}

const FormatButtonGroup = (props: FormatButtonGroupProps) => {
    const { className, children } = props;
    let cls: any = ['docEditer-formatButton-button-group'];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return (
        <Button.Group
            className={ cls }
        >
            { children }
        </Button.Group>
    )
}

FormatButton.Group = FormatButtonGroup;

export default FormatButton;