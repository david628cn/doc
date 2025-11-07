package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	globalLogger *zap.Logger
	once         sync.Once
)

type LogConfig struct {
	Level         string `yaml:"level"`
	FilePath      string `yaml:"file_path"`
	MaxSize       int    `yaml:"max_size"` // MB
	MaxBackups    int    `yaml:"max_backups"`
	MaxAge        int    `yaml:"max_age"` // days
	Compress      bool   `yaml:"compress"`
	ConsoleOutput bool   `yaml:"console_output"`
}

func InitLogger(config LogConfig) {
	once.Do(func() {
		// 日志级别转换
		var level zapcore.Level
		switch config.Level {
		case "debug":
			level = zapcore.DebugLevel
		case "info":
			level = zapcore.InfoLevel
		case "warn":
			level = zapcore.WarnLevel
		case "error":
			level = zapcore.ErrorLevel
		default:
			level = zapcore.InfoLevel
		}

		// 文件日志切割配置
		fileWriter := zapcore.AddSync(&lumberjack.Logger{
			//Filename:   config.FilePath,
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
		})

		// 多输出源配置
		cores := []zapcore.Core{
			zapcore.NewCore(
				getJSONEncoder(),
				fileWriter,
				level,
			),
		}

		if config.ConsoleOutput {
			cores = append(cores, zapcore.NewCore(
				getConsoleEncoder(),
				zapcore.AddSync(os.Stdout),
				level,
			))
		}

		// 创建核心
		core := zapcore.NewTee(cores...)

		// 构建Logger
		globalLogger = zap.New(
			core,
			zap.AddCaller(),
			zap.AddCallerSkip(1),
			zap.AddStacktrace(zapcore.ErrorLevel),
		)
	})
}

func getJSONEncoder() zapcore.Encoder {
	return zapcore.NewJSONEncoder(zapcore.EncoderConfig{
		TimeKey:       "ts",
		LevelKey:      "level",
		NameKey:       "logger",
		CallerKey:     "caller",
		FunctionKey:   zapcore.OmitKey,
		MessageKey:    "msg",
		StacktraceKey: "stacktrace",
		LineEnding:    zapcore.DefaultLineEnding,
		EncodeLevel:   zapcore.LowercaseLevelEncoder,
		//EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeTime:     zapcore.RFC3339NanoTimeEncoder, // 纳秒级精度
		EncodeDuration: zapcore.StringDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	})
}

func getConsoleEncoder() zapcore.Encoder {
	cfg := zap.NewDevelopmentEncoderConfig()
	//cfg.EncodeTime = zapcore.ISO8601TimeEncoder
	cfg.EncodeTime = zapcore.RFC3339NanoTimeEncoder
	cfg.EncodeLevel = zapcore.CapitalColorLevelEncoder
	return zapcore.NewConsoleEncoder(cfg)
}

// 对外暴露的日志方法
func Debug(msg string, fields ...zap.Field) {
	globalLogger.Debug(msg, fields...)
}

func Info(msg string, fields ...zap.Field) {
	globalLogger.Info(msg, fields...)
}

func Warn(msg string, fields ...zap.Field) {
	globalLogger.Warn(msg, fields...)
}

func Error(msg string, fields ...zap.Field) {
	globalLogger.Error(msg, fields...)
}

func Fatal(msg string, fields ...zap.Field) {
	globalLogger.Fatal(msg, fields...)
}

func With(fields ...zap.Field) *zap.Logger {
	return globalLogger.With(fields...)
}
