package playload

type PaginationData struct {
	List  interface{} `json:"list"`
	Total int64       `json:"total"`
}
