package playload

import "time"

type TradeRequest struct {
	Code string    `json:"code"`
	Date time.Time `json:"date"`
}
