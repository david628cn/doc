import { useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { 
    AlignLeftIcon,
    AlignCenterIcon,
    AlignRightIcon,
    AlignJustifyIcon
 } from '@/assets/Icon';

export type TextAlignProps = {
    className?: string;
    value?: any;
    defaultValue?: any;
    // data?: Array<any>;
    onChange?: Function;
}

export const TextAlign: React.FC<TextAlignProps> = props => {
    const [active, setActive] = useState(props.value || props.defaultValue);

    useEffect(() => {
        setActive(props.value);
    }, [props.value]);

    const handleClick = (v: string) => {
        return (e: MouseEvent) => {
            if (!('value' in props)) {
                setActive(v);
            }
            props.onChange?.({
                domEvent: e,
                value: v
            });
        }
    }
    return (
        <ButtonGroup>
            <Button
                type="link"
                title="Align left"
                active={active === 'left'}
                onClick={handleClick('left')}
            >
                {AlignLeftIcon}
            </Button>
            <Button
                type="link"
                title="Align center"
                active={active === 'center'}
                onClick={handleClick('center')}
            >
                {AlignCenterIcon}
            </Button>
            <Button
                type="link"
                title="Align right"
                active={active === 'right'}
                onClick={handleClick('right')}
            >
                {AlignRightIcon}
            </Button>
            <Button
                type="link"
                title="Align justify"
                active={active === 'justify'}
                onClick={handleClick('justify')}
            >
                {AlignJustifyIcon}
            </Button>
        </ButtonGroup>
    )
}