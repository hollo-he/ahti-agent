package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// StartFileCleanupTask 启动文件清理任务
func StartFileCleanupTask(dir string, checkInterval, maxAge time.Duration) {
	ticker := time.NewTicker(checkInterval)
	quit := make(chan struct{})

	go func() {
		for {
			select {
			case <-ticker.C:
				cleanupFiles(dir, maxAge)
			case <-quit:
				ticker.Stop()
				return
			}
		}
	}()

	fmt.Printf("已启动文件清理任务，目录: %s, 间隔: %v, 最大年龄: %v\n", dir, checkInterval, maxAge)
}

// cleanupFiles 清理过期文件
func cleanupFiles(dir string, maxAge time.Duration) {
	now := time.Now()

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // 忽略错误，继续遍历
		}

		// 跳过目录
		if info.IsDir() {
			return nil
		}

		// 检查文件是否过期
		if now.Sub(info.ModTime()) > maxAge {
			// 删除过期文件
			err := os.Remove(path)
			if err != nil {
				fmt.Printf("删除过期文件失败 %s: %v\n", path, err)
			} else {
				fmt.Printf("已删除过期文件: %s\n", path)
			}
		}

		return nil
	})

	if err != nil {
		fmt.Printf("遍历目录时出错: %v\n", err)
	}
}