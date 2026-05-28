package playload

import (
	"app/model"
	"mime/multipart"
)

type CheckChunksResult struct {
	File     *model.File `form:"file" json:"file"`
	Skip     bool        `form:"skip" json:"skip"`
	Uploaded []string    `form:"uploaded" json:"uploaded"`
	Message  string      `form:"message" json:"message"`
}

type MergeChunksResult struct {
	OriginName  string `form:"origin_name" json:"origin_name"`
	Name        string `form:"name" json:"name"`
	Type        string `form:"type" json:"type"`
	MimeType    string `form:"mime_type" json:"mime_type"` // MIME类型 (如: application/pdf)
	Size        int64  `form:"size" json:"size"`           // 文件实际大小（字节）
	Path        string `form:"path" json:"path"`           // 最终存储的物理绝对路径
	Description string `form:"description" json:"description"`
	Hash        string `form:"hash" json:"hash"` // 合并后计算出的指纹（用于校验一致性）
	RelatedType string `form:"related_type" json:"related_type"`
	Visibility  string `form:"visibility" json:"visibility"`
}

type CheckChunksReq struct {
	FileName    string `form:"filename" json:"filename" binding:"required"`
	Size        int64  `form:"size" json:"size" binding:"required"`
	Hash        string `form:"hash" json:"hash" binding:"omitempty,min=1"`
	RelatedType string `form:"related_type" json:"related_type"`
}

type UploadChunksReq struct {
	File        *multipart.FileHeader `form:"file" binding:"required"`
	Index       int64                 `form:"index" binding:"min=0"`
	Hash        string                `form:"hash" binding:"omitempty,min=1"`
	RelatedType string                `form:"related_type" json:"related_type"`
	//ChunkNumber      int64                 `form:"chunkNumber" binding:"min=0"`
	//CurrentChunkSize int64                 `form:"currentChunkSize" binding:"min=0"`
	//ChunkSize        int64                 `form:"chunkSize" binding:"min=0"`
	//TotalSize        int64                 `form:"totalSize" binding:"min=0"`
	//TotalChunks      int64                 `form:"totalChunks" binding:"min=0"`
	//Filename         string                `form:"filename" binding:"omitempty,min=1"`
}

type MergeChunksReq struct {
	FileName    string `form:"filename" json:"filename" binding:"required"`
	Hash        string `form:"hash" json:"hash" binding:"omitempty,min=1"`
	Description string `form:"description" binding:"omitempty,min=1"`
	RelatedType string `form:"related_type" json:"related_type"`
	RelatedID   string `json:"related_id" form:"related_id" binding:"omitempty,min=1"`
}

type UploadReq struct {
	File        *multipart.FileHeader `form:"file" binding:"required"`
	Hash        string                `form:"hash" binding:"omitempty,min=1"`
	Description string                `form:"description" binding:"omitempty,min=1"`
	RelatedType string                `form:"related_type" json:"related_type"`
	RelatedID   string                `json:"related_id" form:"related_id" binding:"omitempty,min=1"`
}
