import React from 'react';
import ReactDOM from 'react-dom/client';
import { store } from "./store";
import { Provider } from "react-redux";
import { IntlProvider } from "react-intl";
import { Table, Pagination, ConfigProvider } from 'antd';
import zh_CN from 'antd/es/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import { getCurrentLang, getCurrentMessages } from "./locales";
import App from './app';
import reportWebVitals from './reportWebVitals';
import './theme.less';
import 'virtual:svg-icons-register';

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
root.render(
	<IntlProvider locale={getCurrentLang()} messages={getCurrentMessages()}>
		<Provider store={store}>
			<ConfigProvider locale={zh_CN}>
				<App />
			</ConfigProvider>
		</Provider>
	</IntlProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
