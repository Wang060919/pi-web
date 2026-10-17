import { createTranslator } from './i18nCore.js';
import { messages as english } from './locales/en.js';
import { messages as chinese, templates } from './locales/zh-CN.js';


export const { t, localizedTemplate, localizedText } = createTranslator(english, chinese, templates);
