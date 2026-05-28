def offsetLimit(pageNum: int = 1, pageSize: int = 10):
    limit = pageSize
    offset = (pageNum - 1) * limit
    return {
        "offset": offset,
        "limit": limit
    }

#不包含end索引无素
def startEnd(pageNum: int = 1, pageSize: int = 10):
    start = (pageNum - 1) * pageSize
    end = start + pageSize
    return {
        "start": start,
        "end": end
    }