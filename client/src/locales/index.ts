import zh from './zh-CN';
import en from './en-US';

import { createIntl, createIntlCache } from 'react-intl';

const currentLang = 'zh-CN';
const messages = {
    'zh-CN': zh,
    'en-US': en,
};
export const getCurrentLang = () => currentLang;
export const getCurrentMessages = () => messages[currentLang];

const cache = createIntlCache();
const intl = createIntl(
    {
        locale: currentLang,
        messages: getCurrentMessages(),
    },
    cache
);

export default intl;