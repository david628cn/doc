import { useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@carvy/ui';
import { 
    AlignLeftIcon,
    AlignCenterIcon,
    AlignRightIcon,
    AlignJustifyIcon
 } from '../config/Icon';

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
        return (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!('value' in props)) {
                setActive(v);
            }
            props.onChange?.({
                event: e,
                value: v
            });
        }
    }
    return (
        <ButtonGroup>
            <Button
                variant="soft"
                title="Align left"
                active={active === 'left'}
                onClick={handleClick('left')}
            >
                {AlignLeftIcon}
            </Button>
            <Button
                variant="soft"
                title="Align center"
                active={active === 'center'}
                onClick={handleClick('center')}
            >
                {AlignCenterIcon}
            </Button>
            <Button
                variant="soft"
                title="Align right"
                active={active === 'right'}
                onClick={handleClick('right')}
            >
                {AlignRightIcon}
            </Button>
            <Button
                variant="soft"
                title="Align justify"
                active={active === 'justify'}
                onClick={handleClick('justify')}
            >
                {AlignJustifyIcon}
            </Button>
        </ButtonGroup>
    )
}