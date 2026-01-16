package weather_get

// 天气查询
type WeatherInfo struct {
	City          string `json:"city"`
	Date          string `json:"date"`
	TempMax       string `json:"temp_max"`
	TempMin       string `json:"temp_min"`
	Condition     string `json:"condition"`      // 晴/雨/雪
	DressingIndex string `json:"dressing_index"` // 穿衣建议
	UVIndex       string `json:"uv_index"`       // 紫外线建议
}
