package playload

import "app/model"

type TokenData struct {
	Token     string      `json:"token"`
	TokenType string      `json:"tokenType"`
	User      model.Users `json:"user"`
}
