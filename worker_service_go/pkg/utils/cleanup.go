package utils

import (
	"fmt"
	"log"
	"time"

	"gomod/internal/db"
	"gorm.io/gorm"
)

// StartExpiredPlansCleanupTask 启动过期旅行计划清理任务
func StartExpiredPlansCleanupTask(gormDB *gorm.DB, interval time.Duration) {
	ticker := time.NewTicker(interval)
	quit := make(chan struct{})

	go func() {
		for {
			select {
			case <-ticker.C:
				cleanupExpiredPlans(gormDB)
			case <-quit:
				ticker.Stop()
				return
			}
		}
	}()

	fmt.Printf("已启动过期旅行计划清理任务，间隔: %v\n", interval)
}

// cleanupExpiredPlans 清理过期的旅行计划
func cleanupExpiredPlans(gormDB *gorm.DB) {
	travelPlanRepo := db.NewTravelPlanRepository(gormDB)

	// 标记过期的计划
	err := travelPlanRepo.MarkExpiredPlans()
	if err != nil {
		log.Printf("标记过期旅行计划失败: %v", err)
		return
	}

	// 物理删除已标记为过期的记录（可选）
	err = travelPlanRepo.DeleteExpiredPlans()
	if err != nil {
		log.Printf("删除过期旅行计划记录失败: %v", err)
	}

	fmt.Printf("完成过期旅行计划清理: %v\n", time.Now())
}