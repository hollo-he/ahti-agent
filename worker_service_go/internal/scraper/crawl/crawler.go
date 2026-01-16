package crawl

import (
	"context"
	"sync"
	"time"
)

type Crawler struct {
	workers  int
	interval time.Duration
}

func NewCrawler(workers int, interval time.Duration) *Crawler {
	return &Crawler{
		workers:  workers,
		interval: interval,
	}
}

func (c *Crawler) Crawl(ctx context.Context, urls []string) ([]Article, error) {
	urlCh := make(chan string)
	resultCh := make(chan Article)

	var wg sync.WaitGroup

	// worker pool
	for i := 0; i < c.workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for url := range urlCh {
				jitter(c.interval)

				article, err := crawlCSDN(url)
				if err == nil {
					resultCh <- article
				}
			}
		}()
	}

	// 投递 URL
	go func() {
		for _, u := range urls {
			urlCh <- u
		}
		close(urlCh)
	}()

	// 回收结果
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	var articles []Article
	for a := range resultCh {
		articles = append(articles, a)
	}

	return articles, nil
}
