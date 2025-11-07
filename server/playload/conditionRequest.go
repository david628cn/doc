package playload

type OrderBy struct {
	Asc  []string `json:"asc"`
	Desc []string `json:"desc"`
}

type ConditionRequest struct {
	Filter   map[string]interface{} `json:"filter"`
	OrderBy  `json:"orderBy"`
	PageNum  int `json:"pageNum"`
	PageSize int `json:"pageSize"`
}

type DeleteRequest struct {
	Ids []int64 `json:"ids"`
}
