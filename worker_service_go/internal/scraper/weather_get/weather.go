package weather_get

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"gomod/pkg/utils"
)

// getEnv retrieves environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

const (
	APIHost = "https://nk63yw9gqn.re.qweatherapi.com"

	GeoPath     = "/geo/v2/city/lookup"
	WeatherPath = "/v7/weather/3d"
	// ❗ 升级为 3d 接口，支持未来三天指数
	IndicesPath = "/v7/indices/3d"
)

// 通用请求工具
func doCall(path string, params url.Values) ([]byte, error) {
	apiID := getEnv("HEFENG_API_ID", "362H8NY5K6")
	apiKey := getEnv("HEFENG_API_KEY", "KCWHA7NKAR")

	jwtToken, err := utils.GenerateHefengJWT(apiID, apiKey)
	if err != nil {
		return nil, err
	}

	fullURL := fmt.Sprintf("%s%s?%s", APIHost, path, params.Encode())

	req, _ := http.NewRequest("GET", fullURL, nil)
	req.Header.Set("Authorization", "Bearer "+jwtToken)
	req.Header.Set("Accept", "application/json")

	// 强制使用 HTTP/1.1 保证稳定性
	req.ProtoMajor = 1
	req.ProtoMinor = 1

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

// 1. 获取城市 ID
func getCityID(cityName string) (string, error) {
	params := url.Values{}
	params.Set("location", cityName)
	body, err := doCall(GeoPath, params)
	if err != nil {
		return "", err
	}

	var res struct {
		Code     string `json:"code"`
		Location []struct {
			ID string `json:"id"`
		} `json:"location"`
	}
	json.Unmarshal(body, &res)
	if len(res.Location) == 0 {
		return "", fmt.Errorf("未找到城市")
	}
	return res.Location[0].ID, nil
}

// 2. 获取多日天气报告（主函数）
func GetWeatherReport(cityName string) ([]WeatherInfo, error) {
	fmt.Printf("[DEBUG] 正在获取 [%s] 的 3 日预报...\n", cityName)

	cityID, err := getCityID(cityName)
	if err != nil {
		return nil, err
	}

	// Step 2: 获取 3 天天气
	wParams := url.Values{}
	wParams.Set("location", cityID)
	wBody, err := doCall(WeatherPath, wParams)
	if err != nil {
		return nil, err
	}
	var wData struct {
		Daily []struct {
			FxDate  string `json:"fxDate"`
			TempMax string `json:"tempMax"`
			TempMin string `json:"tempMin"`
			TextDay string `json:"textDay"`
		} `json:"daily"`
	}
	json.Unmarshal(wBody, &wData)

	// Step 3: 获取 3 天生活指数 (3:穿衣, 5:紫外线)
	iParams := url.Values{}
	iParams.Set("location", cityID)
	iParams.Set("type", "3,5")
	iBody, err := doCall(IndicesPath, iParams)
	if err != nil {
		return nil, err
	}
	var iData struct {
		Daily []struct {
			Date string `json:"date"`
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"daily"`
	}
	json.Unmarshal(iBody, &iData)

	// Step 4: 组装多日数据
	var results []WeatherInfo

	// 以天气预报的日期为基准
	for _, dayWeather := range wData.Daily {
		info := WeatherInfo{
			City:      cityName,
			Date:      dayWeather.FxDate,
			TempMax:   dayWeather.TempMax,
			TempMin:   dayWeather.TempMin,
			Condition: dayWeather.TextDay,
		}

		// 在指数数据中寻找匹配该日期的建议
		for _, dayIndex := range iData.Daily {
			if dayIndex.Date == dayWeather.FxDate {
				if dayIndex.Type == "3" {
					info.DressingIndex = dayIndex.Text
				} else if dayIndex.Type == "5" {
					info.UVIndex = dayIndex.Text
				}
			}
		}
		results = append(results, info)
	}

	return results, nil
}
