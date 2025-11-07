package playload

type OffsetLimit struct {
	Offset int `json:"offset"`
	Limit  int `json:"limit"`
}

type StartEndData struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

func OffsetLimitData(pageNum int, pageSize int) OffsetLimit {
	pageNumValue := pageNum
	if pageNumValue == 0 {
		pageNumValue = 1
	}
	pageSizeValue := pageSize
	if pageSizeValue == 0 {
		pageSizeValue = 10
	}
	limit := pageSizeValue
	offset := (pageNumValue - 1) * limit
	return OffsetLimit{
		Offset: offset,
		Limit:  limit,
	}
}

// 不包含end索引无素
func StartEnd(pageNum int, pageSize int) StartEndData {
	pageNumValue := pageNum
	if pageNumValue == 0 {
		pageNumValue = 1
	}
	pageSizeValue := pageSize
	if pageSizeValue == 0 {
		pageSizeValue = 10
	}
	start := (pageNumValue - 1) * pageSizeValue
	end := start + pageSizeValue
	return StartEndData{
		Start: start,
		End:   end,
	}
}

type Expression struct {
	Field string        `json:"field"`
	Op    string        `json:"op"` // 运算符，如 "?%", "<?<=",  "=", ">", "<" 等
	Value []interface{} `json:"value"`
}

type ConditionData struct {
	Filter  *[]Expression `json:"filter"`
	OrderBy *OrderBy      `json:"orderBy"`
	Offset  *int          `json:"offset"`
	Limit   *int          `json:"limit"`
}
