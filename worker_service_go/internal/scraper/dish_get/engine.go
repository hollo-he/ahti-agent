package dish_get

import (
	"sync"
)

func ScrapeDishInfo(dishNames []string) []DishDetail {
	var wg sync.WaitGroup
	resChan := make(chan DishDetail, len(dishNames))

	for _, name := range dishNames {
		wg.Add(1)
		go func(n string) {
			defer wg.Done()
			detail := DishDetail{Title: n}

			// 1. 抓取数据 (Tavily 模式)
			detail.fetchXiachufang(n)

			resChan <- detail
		}(name)
	}

	wg.Wait()
	close(resChan)

	var results []DishDetail
	for r := range resChan {
		results = append(results, r)
	}
	return results
}
