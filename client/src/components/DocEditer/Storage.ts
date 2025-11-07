const localStorage: any = window['localStorage'];
const key = 'content';

export const getStorageItem = () => {
    return JSON.parse(localStorage.getItem(key)) || [{
        type: 'paragraph',
        children: [{ text: 'A line of text in a paragraph.' }],
    }];
}

export const setStorageItem = (value: any) => {
    localStorage.setItem(key, value);
}