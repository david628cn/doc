package playload

type ResponseJSON struct {
	Code    int         `json:"code"`
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
}

func ResponseSuccess(message string, data interface{}) ResponseJSON {
	return ResponseJSON{Code: 200, Data: data, Message: message}
}

func ResponseError(message string, data interface{}) ResponseJSON {
	return ResponseJSON{Code: -1, Data: data, Message: message}
}

func ResponseUnauthorized(message string, data interface{}) ResponseJSON {
	return ResponseJSON{Code: 401, Data: data, Message: message}
}
