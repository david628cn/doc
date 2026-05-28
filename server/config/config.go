package config

import (
	"fmt"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

var (
	globalConfig *Config
	configOnce   sync.Once
)

type Server struct {
	Port int    `mapstructure:"port" json:"port" yaml:"port"`
	Env  string `mapstructure:"env" json:"env" yaml:"env"`
}

type Proxy struct {
	AllowOrigins     []string `mapstructure:"allow_origins" json:"allow_origins" yaml:"allow_origins"`
	AllowMethods     []string `mapstructure:"allow_methods" json:"allow_methods" yaml:"allow_methods"`
	AllowHeaders     []string `mapstructure:"allow_headers" json:"allow_headers" yaml:"allow_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials" json:"allow_credentials" yaml:"allow_credentials"`
	MaxAge           int      `mapstructure:"max_age" json:"max_age" yaml:"max_age"`
	TrustedProxies   []string `mapstructure:"trusted_proxies" json:"trusted_proxies" yaml:"trusted_proxies"`
}

type Database struct {
	DSN string `mapstructure:"dsn"`
}

type Redis struct {
	Addr     string `mapstructure:"addr" json:"addr" yaml:"addr"`
	Password string `mapstructure:"password" json:"password" yaml:"password"`
	DB       int    `mapstructure:"db" json:"db" yaml:"db"`
	// KeyPrefix Gin 侧 Redis 键命名空间，与 collab-server 的 REDIS_PREFIX（Hocuspocus）区分；verify 缓存等为 {key_prefix}verify:v1:...
	KeyPrefix string `mapstructure:"key_prefix" json:"key_prefix" yaml:"key_prefix"`
	// WsPubSubChannel 非空且 Redis 可用时，通过 Pub/Sub 将 Emit 同步到其他 Gin 副本。留空且 key_prefix 非空时默认为 {key_prefix}ws:broadcast。
	WsPubSubChannel string `mapstructure:"ws_pubsub_channel" json:"ws_pubsub_channel" yaml:"ws_pubsub_channel"`
	// VerifyCacheTTLSeconds > 0 且 Redis 可用时，缓存 /internal/collab/verify 成功结果（秒；权限变更最长延迟 TTL）。
	VerifyCacheTTLSeconds int `mapstructure:"verify_cache_ttl_seconds" json:"verify_cache_ttl_seconds" yaml:"verify_cache_ttl_seconds"`
}

type Jwt struct {
	SecretType               string `mapstructure:"secret_type" json:"secret_type" yaml:"secret_type"`
	SecretKey                string `mapstructure:"secret_key" json:"secret_key" yaml:"secret_key"`
	Algorithm                string `mapstructure:"algorithm" json:"algorithm" yaml:"algorithm"`
	AccessTokenExpireMinutes int64  `mapstructure:"access_token_expire_minutes" json:"access_token_expire_minutes" yaml:"access_token_expire_minutes"`
}

type Zap struct {
	Level         string `mapstructure:"level" json:"level" yaml:"level"`
	FilePath      string `mapstructure:"file_path" json:"file_path" yaml:"file_path"`
	MaxSize       int    `mapstructure:"max_size" json:"max_size" yaml:"max_size"`
	MaxBackups    int    `mapstructure:"max_backups" json:"max_backups" yaml:"max_backups"`
	MaxAge        int    `mapstructure:"max_age" json:"max_age" yaml:"max_age"`
	Compress      bool   `mapstructure:"compress" json:"compress" yaml:"compress"`
	ConsoleOutput bool   `mapstructure:"console_output" json:"console_output" yaml:"console_output"`
}

type Upload struct {
	Path string `mapstructure:"path" json:"path" yaml:"path"`
	//Size string `mapstructure:"size" json:"size" yaml:"size"`
}

type Web struct {
	Static    []string `mapstructure:"static" json:"static" yaml:"static"`
	IndexHtml string   `mapstructure:"index_html" json:"index_html" yaml:"index_html"`
}

type Templates struct {
	Path string `mapstructure:"path" json:"path" yaml:"path"`
}

// Collab 協作：與 collab-server（Hocuspocus）共用 internal_secret，對齊 X-Collab-Internal-Secret。
type Collab struct {
	InternalSecret string `mapstructure:"internal_secret" json:"internal_secret" yaml:"internal_secret"`
	// ExpandYdocURL 可选：collab-server 上 expand-ydoc HTTP 根地址（如 http://127.0.0.1:1235），
	// 用于 webhook 仅收到 ydoc 字节时反解 PM JSON + content_text。也可用环境变量 COLLAB_EXPAND_YDOC_URL。
	ExpandYdocURL string `mapstructure:"expand_ydoc_url" json:"expand_ydoc_url" yaml:"expand_ydoc_url"`
}

type Config struct {
	Server    Server    `mapstructure:"server"`
	Proxy     Proxy     `mapstructure:"proxy"`
	Database  Database  `mapstructure:"database"`
	Redis     Redis     `mapstructure:"redis"`
	Jwt       Jwt       `mapstructure:"jwt"`
	Zap       Zap       `mapstructure:"zap"`
	Upload    Upload    `mapstructure:"upload"`
	Web       Web       `mapstructure:"web"`
	Templates Templates `mapstructure:"templates"`
	Collab    Collab    `mapstructure:"collab"`
}

func Init(configPath string) error {
	var initErr error
	configOnce.Do(func() {
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
		viper.AddConfigPath(configPath)

		if err := viper.ReadInConfig(); err != nil {
			initErr = fmt.Errorf("读取配置文件失败: %w", err)
			return
		}

		if err := viper.Unmarshal(&globalConfig); err != nil {
			initErr = fmt.Errorf("解析配置失败: %w", err)
			return
		}

		viper.WatchConfig()
		viper.OnConfigChange(func(e fsnotify.Event) {
			if err := viper.Unmarshal(&globalConfig); err != nil {
				fmt.Printf("配置热更新失败: %v\n", err)
			}
		})
	})
	return initErr
}

func Get() *Config {
	return globalConfig
}
