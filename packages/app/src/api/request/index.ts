import { Alert } from '@carvy/ui';
import { getWorkspaceIdForRequest } from '@/utils/getWorkspaceIdForRequest';
import { applyUnified401, applyUnified403 } from './authFeedback';

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

async function parseResponseBody(result: Response): Promise<any> {
	try {
		const text = await result.text();
		if (!text) return {};
		return JSON.parse(text);
	} catch {
		return {};
	}
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
			cache: 'no-cache',
			headers: {
				'Authorization': ('Bearer ' + localStorage.getItem('token')) || '',
				'X-Workspace-Id': getWorkspaceIdForRequest(), 
				...headers
			},
			method,
			mode: 'cors',
			...options
		});
	} catch (err: any) {
		const { status, statusText } = err.response || {
			status: 500
		};
		const errResult = CommonResult(status, SERVER_CODE_MESSAGE[status] || statusText);
		Alert.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		return errResult;
	}

	if (result.status === 401) {
		const body = await parseResponseBody(result);
		applyUnified401(body?.message);
		return CommonResult(401, body?.message || SERVER_CODE_MESSAGE[401], body?.data);
	}
	if (result.status === 403) {
		const body = await parseResponseBody(result);
		applyUnified403(body?.message);
		return CommonResult(403, body?.message || SERVER_CODE_MESSAGE[403], body?.data);
	}

	if (result?.status === 404 || result?.status === 405) {
		const { status, statusText } = result;
		const errResult = CommonResult(status, SERVER_CODE_MESSAGE[status] || statusText);
		Alert.error({
			message: `请求错误 ${ errResult.code }`,
			description: `${ errResult.message }: ${ url }`
		});
		return errResult;
	}

	const responseJSON = await parseResponseBody(result);

	if (responseJSON?.code === 401) {
		const { message } = responseJSON;
		applyUnified401(message);
		return CommonResult(401, message || SERVER_CODE_MESSAGE[401], responseJSON.data);
	}
	if (responseJSON?.code === 403) {
		const { message } = responseJSON;
		applyUnified403(message);
		return CommonResult(403, message || SERVER_CODE_MESSAGE[403], responseJSON.data);
	}

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

const del = async (params: any) => {
    params.method = 'DELETE';
    return await doRequest(params);
}

const patch = async (params: any) => {
	params.method = 'PATCH';
	return await doRequest(params);
};

request.post = post;
request.get = get;
request.del = del;
request.patch = patch;


export default request;
