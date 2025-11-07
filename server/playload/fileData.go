package playload

type CheckChunksData struct {
	Skip     bool     `form:"skip" json:"skip"`
	Uploaded []string `form:"uploaded" json:"uploaded"`
}
