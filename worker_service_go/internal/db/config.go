package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/go-redis/redis/v8"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB
var RedisClient *redis.Client

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

func InitDB() (*gorm.DB, *redis.Client) {
	// 初始化MySQL
	dbConfig := DBConfig{
		Host:     getEnv("DB_HOST", "192.168.1.149"),
		Port:     getEnv("DB_PORT", "3307"),  // 更正端口为3307
		User:     getEnv("DB_USER", "root"),
		Password: getEnv("DB_PASSWORD", "123456"),
		Database: getEnv("DB_NAME", "AHTI"),  // 更正数据库名为AHTI
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbConfig.User, dbConfig.Password, dbConfig.Host, dbConfig.Port, dbConfig.Database)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true, // 使用单数表名
		},
		// 禁用外键约束
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 由于表已存在，我们不需要自动迁移
	// err = DB.AutoMigrate(&User{}, &TravelPlan{}, &UserSession{})
	// if err != nil {
	// 	log.Fatal("Failed to migrate database:", err)
	// }

	// 初始化Redis
	redisConfig := RedisConfig{
		Addr:     getEnv("REDIS_ADDR", "192.168.1.149:6379"),
		Password: getEnv("REDIS_PASSWORD", ""), // no password set
		DB:       0,                           // use default DB
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     redisConfig.Addr,
		Password: redisConfig.Password,
		DB:       redisConfig.DB,
	})

	// 测试Redis连接
	pong, err := RedisClient.Ping(context.Background()).Result()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	fmt.Println("Redis connected:", pong)

	return DB, RedisClient
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}