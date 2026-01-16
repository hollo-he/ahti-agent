package crawl

import (
	"math/rand"
	"time"
)

func jitter(base time.Duration) {
	if base <= 0 {
		return
	}
	delta := time.Duration(rand.Int63n(int64(base / 2)))
	time.Sleep(base/2 + delta)
}
