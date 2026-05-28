package utils

import (
	"app/logger"
	"app/model"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

func CloseFile(filePtr *os.File) {
	err := filePtr.Close()
	if err != nil {
		logger.Error("文件关闭失败 [Err:%s]\n", zap.Error(err))
	}
}

func LoadJSON(filePath string) (interface{}, error) {
	filePtr, err := os.Open(filePath)
	if err != nil {
		logger.Error("文件打开失败 [Err:%s]\n", zap.Error(err))
		return nil, err
	}
	defer CloseFile(filePtr)
	var info []interface{}
	// 创建json解码器
	decoder := json.NewDecoder(filePtr)
	err = decoder.Decode(&info)
	if err != nil {
		logger.Error("解码失败", zap.Error(err))
	}
	return info, nil
}

func FileIsExist(fileName string) bool {
	fileHandle, err := os.Open(fileName)
	//if os.IsNotExist(err) {
	//	return false
	//}
	if err != nil {
		return false
	}
	defer fileHandle.Close()
	return true
}

func GetSubFilesByDir(dir string) []fs.DirEntry {
	var fileList []fs.DirEntry
	if FileIsExist(dir) {
		files, err := os.ReadDir(dir)
		if err != nil {
			return fileList
		}
		fileList = files
	}
	return fileList
}

//func MergeFiles(sourceFileNameList []string, outFileName string) error {
//	dst, err := os.Create(outFileName) // 注意：需要预先创建 uploads 文件夹或使用其他存储解决方案如云存储等
//	defer dst.Close()                  // 确保在函数结束时关闭目标文件句柄
//	if err != nil {
//		return err
//	}
//	for _, sourceFileName := range sourceFileNameList {
//		chunkFile, err := os.Open(sourceFileName)
//		if err != nil {
//			return err
//		}
//		_, err = io.Copy(dst, chunkFile)
//		if err != nil {
//			chunkFile.Close()
//			return err
//		}
//		chunkFile.Close()
//	}
//	return nil
//}

// MergeFiles 健壯的流式合併方法
func MergeFiles(srcDir string, targetPath string) error {
	// 1. 讀取目錄下所有分片
	files, err := os.ReadDir(srcDir)
	fmt.Printf(" [DEBUG] 合并开始，分片总数: %d \n", len(files))
	if err != nil {
		return err
	}

	// 2. 按照分片文件名（數字）進行升序排列
	// 必須排序，否則字符串排序會導致 "10" 排在 "2" 前面
	sort.Slice(files, func(i, j int) bool {
		a, _ := strconv.Atoi(files[i].Name())
		b, _ := strconv.Atoi(files[j].Name())
		return a < b
	})

	// 3. 創建目標文件
	// 使用 O_CREATE|O_WRONLY|O_TRUNC 確保文件是全新的
	target, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0666)
	if err != nil {
		return err
	}
	defer target.Close()

	// 4. 逐個流式寫入
	for _, f := range files {
		if f.IsDir() {
			continue
		}

		err := func() error {
			sourcePath := filepath.Join(srcDir, f.Name())
			source, err := os.Open(sourcePath)
			if err != nil {
				return err
			}
			defer source.Close()

			// 使用 io.Copy 進行流式拷貝，不會將整個文件讀入內存
			if _, err := io.Copy(target, source); err != nil {
				return err
			}
			return nil
		}()

		if err != nil {
			return err
		}
	}

	// 5. 強制將緩存寫入磁盤，確保文件完整性
	return target.Sync()
}

// VerifyFile 校验物理文件 Hash 是否与预期一致
func VerifyFile(filePath string, expectedHash string) (bool, string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return false, "", err
	}
	defer file.Close()

	// 初始化哈希计算器（如果你前端用 SHA256，这里换成 sha256.New()）
	hashAppender := md5.New()

	// 使用 io.Copy 流式读取文件内容并压入哈希计算器
	// 这样不会把整个大文件读入内存
	if _, err := io.Copy(hashAppender, file); err != nil {
		return false, "", err
	}

	// 计算最终结果
	actualHash := hex.EncodeToString(hashAppender.Sum(nil))

	// 返回：是否一致, 实际哈希, 错误信息
	return actualHash == expectedHash, actualHash, nil
}

func GetFileMimeType(filePath string) string {
	f, err := os.Open(filePath)
	if err != nil {
		return "application/octet-stream"
	}
	defer f.Close()

	// 只读取文件前 512 个字节，足以判定 MimeType
	buffer := make([]byte, 512)
	_, err = f.Read(buffer)
	if err != nil {
		return "application/octet-stream"
	}

	// 使用标准库探测内容真实类型（不依赖后缀名）
	return http.DetectContentType(buffer)
}

func DeleteFile(fileName string) error {
	if err := os.Remove(fileName); err != nil {
		return err
	}
	return nil
}

func DeleteDir(dir string) error {
	//err := filepath.Walk("exampleDir", func(path string, info os.FileInfo, err error) error {
	//	if err != nil {
	//		return err // 处理访问错误（例如权限问题）
	//	}
	//	if info.IsDir() {
	//		return nil // 如果是目录，不执行删除操作，因为已经在遍历中处理了其子项。
	//	} else {
	//		// 删除文件或链接等非目录项。注意：这将不会删除目录本身。
	//		err := os.Remove(path)
	//		if err != nil {
	//			return err // 处理删除错误
	//		}
	//	}
	//	return nil // 继续遍历下一项。注意：这将不会删除目录本身。需要额外调用os.RemoveAll("exampleDir")。
	//})
	//if err != nil {
	//	fmt.Println("Error walking through directory:", err)
	//	return
	//}
	//// 最后删除目录本身。注意：这将不会自动删除空目录中的文件。上面的遍历确保了这一点。
	//err = os.RemoveAll("exampleDir") // 再次调用以删除空目录。如果已经是空目录，则此调用是多余的。但为了完整性，通常这样做。
	//if err != nil {
	//	fmt.Println("Error removing directory:", err) // 处理可能的错误（例如权限问题）或不存在的目录。
	//	return // 或者根据需要决定是否继续执行其他操作。例如，如果目录不存在，通常这不是错误情况。
	//} else {
	//	fmt.Println("Directory and its contents deleted successfully")
	//}

	if err := os.RemoveAll(dir); err != nil {
		return err
	}
	return nil
}

func UploadFile(sourceFileName *multipart.FileHeader, outFileName string) error {
	//if err := os.MkdirAll(md5Dir, 0755); err != nil {
	//	return err
	//}
	//err := os.WriteFile(filepath.Join(md5Dir, strconv.FormatInt(params.ChunkNumber, 10)), params.File, 0644)
	//if err != nil {
	//	return err
	//}

	sourceFileHandle, err := sourceFileName.Open()
	defer sourceFileHandle.Close()
	if err != nil {
		return err
	}
	dst, err := os.Create(outFileName) // 注意：需要预先创建 uploads 文件夹或使用其他存储解决方案如云存储等
	defer dst.Close()                  // 确保在函数结束时关闭目标文件句柄
	if err != nil {
		return err
	}
	// 将上传的文件内容复制到目标文件路径
	_, err = io.Copy(dst, sourceFileHandle)
	if err != nil {
		return err
	}
	return nil
}

func GetSaveDir(basePath string, wsID uuid.UUID, relatedType string) (string, string) {
	// 1. 獲取業務配置
	cfg, ok := model.TypeConfigMap[relatedType]
	if !ok {
		// 預設保底配置
		cfg = model.FileTypeConfig{Visibility: model.VisPrivate, SubPath: "others"}
	}

	// 2. 根據 Visibility 決定第一層隔離目錄
	var wsDir string
	switch cfg.Visibility {
	case model.VisPublic:
		// 公開資源（頭像、Emoji），統一存放在公共目錄，不看 wsID
		wsDir = model.VisPublic // "public"
	case model.VisPrivate, model.VisInherit:
		// 私有或繼承資源，必須按工作區隔離
		if wsID != uuid.Nil {
			wsDir = wsID.String()
		} else {
			// 如果業務是私有的但沒傳 wsID，建議存入一個專門的待處理目錄或報錯
			wsDir = "unassigned"
		}
	default:
		wsDir = "others"
	}

	// 3. 拼接最終路徑
	// 例子 1 (Avatar): uploads/public/avatars
	// 2 (Page): uploads/{uuid}/attachments/pages
	fullPath := filepath.Join(basePath, wsDir, cfg.SubPath)

	return fullPath, cfg.Visibility
}
