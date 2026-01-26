import { type ReactNode } from 'react';
import { Tooltip } from '@/components/dropdown';
import { CLASSNAME } from '@/global';
import './index.less';

const Types: any = Object.freeze({
    link: 'link'
});

export type ButtonProps = {
    title?: string;
    className?: string;
    type?: string;
    active?: boolean;
    children?: ReactNode;
    // onClick?: Function;
    [key: string]: unknown
}

export const Button = (props: ButtonProps) => {
    const { className, title, active, type = 'default', children, ...otherProps } = props;
    // const [open, setOpen] = useState(false);
    // const [active, setActive] = useState(props.active);

    // useEffect(() => {
    //     setActive(props.active);
    // }, [props.active]);

    const handlePointerDown = (e: any) => {
        e.preventDefault();
    }

    // const handleClick = (e: any) => {
    //     e.preventDefault();
    //     // setOpen(false);
    //     props.onClick?.(e);
    // }

    // const handleMouseOver = (e: any) => {
    //     e.preventDefault();
    //     if (e.target.classList.contains('ant-dropdown-open')) {
    //         setOpen(false);
    //     } else {
    //         setOpen(true);
    //     }
    // }

    // const handleMouseLeave = (e: any) => {
    //     e.preventDefault();
    //     setOpen(false);
    // }

    let cls: any = [`${CLASSNAME}-button`];
    if (className !== undefined) {
        cls.push(className);
    }
    if (Types[type]) {
        cls.push(`${CLASSNAME}-button-${Types[type]}`);
    }
    if (active) {
        cls.push(`${CLASSNAME}-button-active`);
    }
    cls = cls.join(' ');

    const btnCmp = <button
        onPointerDown={handlePointerDown}
        // onClick={handleClick}
        {...otherProps}
        className={cls}
    // title={title} 
    // onMouseEnter={handleMouseOver}
    // onMouseLeave={handleMouseLeave}
    >
        {children}
    </button>

    if (title === undefined) {
        return btnCmp;
    }

    return <Tooltip
        title={title}
        defaultOpen={false}
        placement='b-t?'
    >
        { btnCmp }
    </Tooltip>;
}

export type ButtonGroupProps = {
    className?: string;
    children?: ReactNode;
    [key: string]: unknown
}

export const ButtonGroup = (props: ButtonGroupProps) => {
    const { className, children } = props;
    let cls: any = [`${CLASSNAME}-button-group`];
    if (className !== undefined) {
        cls.push(className);
    }
    cls = cls.join(' ');

    return (
        <div
            className={cls}
        >
            {children}
        </div>
    )
}
