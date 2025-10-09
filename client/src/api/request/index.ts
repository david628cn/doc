import { notification } from 'antd';
// import history from '@/utils/history';

const request: any = {};

const SERVER_CODE_MESSAGE: any = {
	0: '请求发送失败',
	200: '服务器成功返回请求的数据',
	400: 'Bad Request',
	401: 'Unauthorized',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	500: '服务器发生错误，请检查服务器(Internal Server Error)',
	502: '网关错误(Bad Gateway)',
	503: '服务不可用，服务器暂时过载或维护(Service Unavailable)',
	504: '网关超时(Gateway Timeout)',
};

const CommonResult = (code: number = 500, message: string, data?: any) => {
	return {
		code,
		message,
		data
	};
}

const doRequest = async ({
	url,
	method = 'POST',
	headers = {},
	data,
	...options
}: any) => {
	let result: any;
	let urlAction = url;
	if (method.toUpperCase() === 'GET') {
		urlAction = `${ url }?${ new URLSearchParams(data).toString() }`;
	} else {
		options.body = data;
	}
	try {
		result = await fetch(urlAction, {
			// body: data, // must match 'Content-Type' header
			cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
			// credentials: 'include', // include, same-origin, *omit
			headers: {
				//'user-agent': 'Mozilla/4.0 MDN Example',
				'content-type': 'application/json',
				'Authorization': ('Bearer ' + localStorage.getItem('token')) || '',
				// 'Authorization': localStorage.getItem('token') || '',
				...headers
			},
			method, // *GET, POST, PUT, DELETE, etc.
			mode: 'cors', // no-cors, cors, *same-origin
			// redirect: 'follow', // manual, *follow, error
			// referrer: 'no-referrer', // *client, no-referrer
			...options
		});
	} catch (err: any) {
		const { status, statusText } = err.response || {
			status: 500
		};
		const errResult = CommonResult(status, SERVER_CODE_MESSAGE[status] || statusText);
		notification.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		return errResult;
	}
	if (result?.status === 404 || result?.status === 405) {
		// console.log(result);
		const { status, statusText } = result;
		const errResult = CommonResult(status, SERVER_CODE_MESSAGE[status] || statusText);
		notification.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		// history.push('/login');
		return errResult;
	}
	// return result.json().then((responseJSON: any) => {
	// 	if (responseJSON?.code === 401) {
	// 		const { code, message } = responseJSON;
	// 		const errResult = CommonResult(code, message || SERVER_CODE_MESSAGE[code]);
	// 		notification.error({
	// 			message: `请求错误 ${ errResult.code }`,
	// 			description: `${ errResult.message }: ${ url }`
	// 		});
	// 		history.push('/login');
	// 		return errResult;
	// 	}
	// 	return responseJSON;
	// });

	let responseJSON;
	try {
		responseJSON = await result.json();
	} catch (err: any) {
		const errResult = CommonResult(0, SERVER_CODE_MESSAGE[0]);
		notification.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		return errResult;
	}

	if (responseJSON?.code === 401 || responseJSON?.code === 403) {
		const { code, message } = responseJSON;
		const errResult = CommonResult(code, message || SERVER_CODE_MESSAGE[code]);
		notification.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		// history.push('/login');
		return errResult;
	}

	// if (responseJSON?.code === 403) {
	// 	const { code, message } = responseJSON;
	// 	const errResult = CommonResult(code, message || SERVER_CODE_MESSAGE[code]);
	// 	notification.error({
	// 		message: `请求错误 ${ errResult.code }`,
	// 		description: `${ errResult.message }: ${ url }`
	// 	});
	// 	// history.push('/login');
	// 	return errResult;
	// }

	return responseJSON;
}

const post = async (params: any) => {
	params.method = 'POST';
	return await doRequest(params);
}

const get = async (params: any) => {
	params.method = 'GET';
	return await doRequest(params);
}

request.post = post;
request.get = get;



export default request;