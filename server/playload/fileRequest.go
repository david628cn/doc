package playload

import "mime/multipart"

type CheckChunksRequest struct {
	FileName string `form:"filename" json:"filename" binding:"required"`
	Md5      string `form:"md5" json:"md5" binding:"md5"`
}

type UploadChunksRequest struct {
	File             *multipart.FileHeader `form:"file" binding:"required"`
	ChunkNumber      int64                 `form:"chunkNumber" binding:"min=0"`
	CurrentChunkSize int64                 `form:"currentChunkSize" binding:"min=0"`
	ChunkSize        int64                 `form:"chunkSize" binding:"min=0"`
	TotalSize        int64                 `form:"totalSize" binding:"min=0"`
	TotalChunks      int64                 `form:"totalChunks" binding:"min=0"`
	Md5              string                `form:"md5" binding:"omitempty,min=1"`
	Filename         string                `form:"filename" binding:"omitempty,min=1"`
}

type MergeChunksRequest struct {
	FileName string `form:"filename" json:"filename" binding:"required"`
	Md5      string `form:"md5" json:"md5" binding:"md5"`
	Desc     string `form:"desc" binding:"omitempty,min=1"`
}

type UploadRequest struct {
	File *multipart.FileHeader `form:"file" binding:"required"`
	Md5  string                `form:"md5" binding:"omitempty,min=1"`
	Desc string                `form:"desc" binding:"omitempty,min=1"`
}
