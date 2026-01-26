import { useEffect, useRef } from 'react';

export const useDelayer = (callback: Function, delay: number = 0) => {
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            callback();
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [callback, delay]);

    const cancel = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    return cancel;
};