import React, { useCallback } from 'react';
import { Input } from '../input';
import { CLASSNAME } from '../config'; 
import './index.less';

export const debounce = (fn: Function, delay: number = 300) => {
    let timer: any = null;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

export type SearchInputProps = {
    className?: string;
    placeholder?: string;
    timeout?: number;
    style?: React.CSSProperties;
    autoFocus?: boolean;
    onSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = props => {
    const { 
        className, 
        placeholder,
        autoFocus,
        style,
        onSearch,
        timeout = 200
    } = props;

    const handleSearch = (value: string) => {
        onSearch?.(value);
    };

    const debouncedSearch = useCallback(debounce(handleSearch, timeout), []);

    const handleChange = (value: any) => {
        debouncedSearch(value);
    }

    const cls = [`${CLASSNAME}-search-input`];

    if (className) {
        cls.push(className);
    }

    return (
        <div className={cls.join(' ')} style={style}>
            <Input 
                className={`${CLASSNAME}-search-input-field`}
                placeholder={placeholder}
                onChange={handleChange}
                autoFocus={autoFocus}
            />
            <div className={`${CLASSNAME}-search-input-icon`}>
                <svg height="1em" width="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                </svg>
            </div>
        </div>
    );
}