package ot

import (
	"errors"
	"fmt"
	"sort"
)

// Operation 定义文档操作类型
type Operation struct {
	ClientID string // 客户端唯一标识
	Type     string // "insert"或"delete"
	Pos      int    // 操作位置
	Value    string // 操作内容
	Version  int    // 操作版本号
}

// Document 协同文档结构体
type Document struct {
	Text     string         // 文档内容
	Ops      []Operation    // 操作历史记录
	Versions map[string]int // 各客户端最新版本号
}

// NewDocument 创建新文档
func NewDocument(initialText string) *Document {
	return &Document{
		Text:     initialText,
		Ops:      make([]Operation, 0),
		Versions: make(map[string]int),
	}
}

// Transform 核心转换函数
func Transform(op1, op2 Operation) (Operation, Operation, error) {
	switch {
	case op1.Type == "insert" && op2.Type == "insert":
		return transformInserts(op1, op2)
	case op1.Type == "insert" && op2.Type == "delete":
		return transformInsertDelete(op1, op2)
	case op1.Type == "delete" && op2.Type == "insert":
		return transformDeleteInsert(op1, op2)
	case op1.Type == "delete" && op2.Type == "delete":
		return transformDeletes(op1, op2)
	default:
		return Operation{}, Operation{}, errors.New("invalid operation types")
	}
}

func transformInserts(a, b Operation) (Operation, Operation, error) {
	if a.Pos < b.Pos {
		return a, Operation{b.ClientID, b.Type, b.Pos + len(a.Value), b.Value, b.Version}, nil
	} else if a.Pos > b.Pos {
		return Operation{a.ClientID, a.Type, a.Pos + len(b.Value), a.Value, a.Version}, b, nil
	}
	// 相同位置时按客户端ID排序
	if a.ClientID < b.ClientID {
		return a, Operation{b.ClientID, b.Type, b.Pos + len(a.Value), b.Value, b.Version}, nil
	}
	return Operation{a.ClientID, a.Type, a.Pos + len(b.Value), a.Value, a.Version}, b, nil
}

func transformInsertDelete(ins, del Operation) (Operation, Operation, error) {
	if ins.Pos <= del.Pos {
		return ins, Operation{del.ClientID, del.Type, del.Pos + len(ins.Value), del.Value, del.Version}, nil
	}
	return Operation{ins.ClientID, ins.Type, ins.Pos - len(del.Value), ins.Value, ins.Version}, del, nil
}

func transformDeleteInsert(del, ins Operation) (Operation, Operation, error) {
	if del.Pos < ins.Pos {
		return del, Operation{ins.ClientID, ins.Type, ins.Pos - len(del.Value), ins.Value, ins.Version}, nil
	}
	return Operation{del.ClientID, del.Type, del.Pos + len(ins.Value), del.Value, del.Version}, ins, nil
}

func transformDeletes(a, b Operation) (Operation, Operation, error) {
	if a.Pos < b.Pos {
		endA := a.Pos + len(a.Value)
		if endA <= b.Pos {
			return a, Operation{b.ClientID, b.Type, b.Pos - len(a.Value), b.Value, b.Version}, nil
		}
		overlap := endA - b.Pos
		return Operation{a.ClientID, a.Type, a.Pos, a.Value[:len(a.Value)-overlap], a.Version},
			Operation{b.ClientID, b.Type, a.Pos, b.Value[overlap:], b.Version}, nil
	} else if a.Pos > b.Pos {
		endB := b.Pos + len(b.Value)
		if endB <= a.Pos {
			return Operation{a.ClientID, a.Type, a.Pos - len(b.Value), a.Value, a.Version}, b, nil
		}
		overlap := endB - a.Pos
		return Operation{a.ClientID, a.Type, b.Pos, a.Value[overlap:], a.Version},
			Operation{b.ClientID, b.Type, b.Pos, b.Value[:len(b.Value)-overlap], b.Version}, nil
	}
	// 相同位置时保留较长删除
	if len(a.Value) > len(b.Value) {
		return Operation{a.ClientID, a.Type, a.Pos, a.Value[len(b.Value):], a.Version}, Operation{}, nil
	} else if len(a.Value) < len(b.Value) {
		return Operation{}, Operation{b.ClientID, b.Type, b.Pos, b.Value[len(a.Value):], b.Version}, nil
	}
	return Operation{}, Operation{}, nil
}

// ApplyOperation 应用操作到文档
func (doc *Document) ApplyOperation(op Operation) error {
	// 检查操作版本
	if op.Version <= doc.Versions[op.ClientID] {
		return errors.New("stale operation")
	}

	// 转换历史操作
	for i := range doc.Ops {
		if doc.Ops[i].ClientID == op.ClientID {
			continue
		}
		newOp, _, err := Transform(op, doc.Ops[i])
		if err != nil {
			return err
		}
		op = newOp
	}

	// 执行操作
	switch op.Type {
	case "insert":
		doc.Text = doc.Text[:op.Pos] + op.Value + doc.Text[op.Pos:]
	case "delete":
		if op.Pos >= len(doc.Text) {
			return nil
		}
		end := op.Pos + len(op.Value)
		if end > len(doc.Text) {
			end = len(doc.Text)
		}
		doc.Text = doc.Text[:op.Pos] + doc.Text[end:]
	}

	// 记录操作并更新版本
	doc.Ops = append(doc.Ops, op)
	doc.Versions[op.ClientID] = op.Version
	return nil
}

// GetOperationsSince 获取指定版本后的操作
func (doc *Document) GetOperationsSince(clientID string, version int) []Operation {
	var ops []Operation
	for _, op := range doc.Ops {
		if op.ClientID != clientID && op.Version > version {
			ops = append(ops, op)
		}
	}
	sort.Slice(ops, func(i, j int) bool {
		return ops[i].Version < ops[j].Version
	})
	return ops
}

func main() {
	// 示例：模拟两个客户端协同编辑
	doc := NewDocument("Hello")
	clientA := "clientA"
	clientB := "clientB"

	// 客户端A的操作
	opA := Operation{clientA, "insert", 5, " World", 1}
	if err := doc.ApplyOperation(opA); err != nil {
		fmt.Println("ClientA error:", err)
	}

	// 客户端B的操作
	opB := Operation{clientB, "insert", 0, "Say ", 1}
	if err := doc.ApplyOperation(opB); err != nil {
		fmt.Println("ClientB error:", err)
	}

	fmt.Println("Final document:", doc.Text) // 输出: Say Hello World
}
