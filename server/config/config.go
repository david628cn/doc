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
