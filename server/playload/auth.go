package playload

import (
	"app/model"
)

type AuthData struct {
	Token     string      `json:"token"`
	TokenType string      `json:"tokenType"`
	User      *model.User `json:"user"`
	// WorkspaceID string      `json:"workspaceId"`
	//CurrentWorkspace *WorkspaceSpaces    `json:"current_workspace"`
	//Workspaces       []UserWorkspaceData `json:"workspaces"`
}
