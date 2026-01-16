package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"gomod/internal/scraper/route_get"
	"gomod/internal/scraper/ticket_get"
	"gomod/internal/scraper/weather_get"
	"os"
	"regexp"
	"strconv"
	"strings"

	// 给两个 template 包起别名，防止冲突
	htmlTpl "html/template"
	textTpl "text/template"
)

type TravelPlan struct {
	City         string                             `json:"city"`
	Origin       string                             `json:"origin"`
	Destination  string                             `json:"destination"`
	WeatherList  []weather_get.WeatherInfo          `json:"weather_list"`
	RouteOptions map[string]*route_get.TravelOption `json:"route_options"`
	Tickets      []ticket_get.TicketInfo            `json:"tickets"`
}

type HTMLTemplateData struct {
	Plan      *TravelPlan
	RouteJSON htmlTpl.JS
	AMAP_API_KEY string
}

func CleanInstruction(input string) string {
	re := regexp.MustCompile(`map\[.*?name:([^\]\s]+).*?\]`)
	return re.ReplaceAllString(input, "$1")
}

// --- Markdown 增强：图标映射 ---
func getStepIcon(instruction string) string {
	switch {
	case strings.Contains(instruction, "起点") || strings.Contains(instruction, "出发"):
		return "📍"
	case strings.Contains(instruction, "左转"):
		return "↩️"
	case strings.Contains(instruction, "右转"):
		return "↪️"
	case strings.Contains(instruction, "直行"):
		return "⬆️"
	case strings.Contains(instruction, "隧道"):
		return "🚇"
	case strings.Contains(instruction, "环岛"):
		return "🔄"
	case strings.Contains(instruction, "掉头"):
		return "🔃"
	case strings.Contains(instruction, "地铁") || strings.Contains(instruction, "轨道交通"):
		return "🚇"
	case strings.Contains(instruction, "公交"):
		return "🚌"
	case strings.Contains(instruction, "到达") || strings.Contains(instruction, "终点"):
		return "🏁"
	default:
		return "🔹"
	}
}

// --- Markdown 增强：可视化进度折线生成 ---
// 逻辑：计算总里程，按比例用 ─ 填充，插入动作图标
func generateVisualBar(steps []route_get.RouteStep) string {
	if len(steps) == 0 {
		return ""
	}
	var totalDist int
	for _, s := range steps {
		totalDist += s.DistanceM
	}
	if totalDist == 0 {
		return "📍────🏁"
	}

	const maxChars = 25 // 设定手机端 MD 屏幕适配的总长度
	var bar strings.Builder
	bar.WriteString("📍") // 起点

	for i, s := range steps {
		if i == len(steps)-1 {
			break
		}
		// 计算这段路占多少个字符
		ratio := float64(s.DistanceM) / float64(totalDist)
		charCount := int(ratio * maxChars)
		if charCount < 1 && s.DistanceM > 0 {
			charCount = 1
		}
		// 填充比例线
		bar.WriteString(strings.Repeat("─", charCount))
		// 插入关键动作图标
		bar.WriteString(getStepIcon(s.Instruction))
	}
	bar.WriteString("─🏁") // 终点
	return bar.String()
}

func BuildTravelPlan(city, origin, dest, ticketKeyword string) (*TravelPlan, error) {
	fmt.Printf("🌤️ 获取天气信息: %s\n", city)
	weathers, err := weather_get.GetWeatherReport(city)
	if err != nil {
		fmt.Printf("⚠️ 天气获取失败: %v\n", err)
		// 天气获取失败不应该阻止整个流程，使用默认值
		weathers = []weather_get.WeatherInfo{
			{Date: "今天", Condition: "晴", TempMin: strconv.Itoa(15), TempMax: strconv.Itoa(25), DressingIndex: "适宜"},
		}
	}

	fmt.Printf("🗺️ 获取路线信息: %s -> %s\n", origin, dest)
	routes, err := route_get.GetRouteInfo(origin, dest)
	if err != nil {
		fmt.Printf("❌ 路线获取失败: %v\n", err)
		return nil, fmt.Errorf("路线获取失败: %v", err)
	}

	fmt.Printf("🎫 获取票务信息: %s\n", ticketKeyword)
	tickets, err := ticket_get.GetTicketH5Links(ticketKeyword)
	if err != nil {
		fmt.Printf("⚠️ 票务获取失败: %v\n", err)
		// 票务获取失败不应该阻止整个流程，使用空数组
		tickets = []ticket_get.TicketInfo{}
	}

	// 清理路线指令
	for _, option := range routes {
		for i := range option.Steps {
			option.Steps[i].Instruction = CleanInstruction(option.Steps[i].Instruction)
		}
	}

	fmt.Printf("✅ 旅行计划数据聚合完成\n")

	return &TravelPlan{
		City:         city,
		Origin:       origin,
		Destination:  dest,
		WeatherList:  weathers,
		RouteOptions: routes,
		Tickets:      tickets,
	}, nil
}

func (p *TravelPlan) ExportToHTML(filename string) error {
	routeJSON, _ := json.Marshal(p.RouteOptions)
	amapAPIKey := getEnv("AMAP_API_KEY", "5e7f021f88e83fa2b782125f4bbbf193")
	data := HTMLTemplateData{
		Plan:      p,
		RouteJSON: htmlTpl.JS(routeJSON),
		AMAP_API_KEY: amapAPIKey,
	}
	funcMap := htmlTpl.FuncMap{
		"sub": func(a, b int) int { return a - b },
	}
	tmpl, err := htmlTpl.New("h5").Funcs(funcMap).Parse(htmlTemplate)
	if err != nil {
		return err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return err
	}
	return os.WriteFile(filename, buf.Bytes(), 0644)
}

func (p *TravelPlan) ExportToMarkdown(filename string) error {
	const mdTemplate = `
# 🌍 {{.City}} 智能出行行程单
> **路线**: {{.Origin}} ➔ {{.Destination}}

## 🌤️ 天气看板
| 日期 | 天气 | 温度 | 穿衣建议 |
| :--- | :--- | :--- | :--- |
{{- range .WeatherList}}
| {{.Date}} | **{{.Condition}}** | {{.TempMin}}°/{{.TempMax}}° | {{.DressingIndex}} |
{{- end}}

## 🛣️ 路线可视化全览
{{- range $mode, $opt := .RouteOptions}}
### {{if eq $mode "driving"}}🚗 自驾方案{{else}}🚇 公交方案{{end}}
**全程进度 (比例化折线):**
` + "```" + `text
{{ visualBar $opt.Steps }}
` + "```" + `
> 📏 **总里程**: {{$opt.DistanceKm}}km | ⏳ **预计耗时**: {{$opt.DurationMin}}min

---

**📋 详细环节拆解:**
{{- range $opt.Steps}}
{{ if gt .DistanceM 0 }}
- **{{ stepIcon .Instruction }}** {{ .Instruction }}
  - *路段长 {{ .DistanceM }}m | 预计耗时 {{ .DurationMin }}min*
{{- end }}
{{- end }}
{{ end }}

## 🎫 票务预约通道
{{- range .Tickets}}
- [ ] **{{.Name}}** [点击快速预约]({{.URL}})
{{- end}}

---
*Generated by Smart Life Agent @ {{.City}}*
`

	funcMap := textTpl.FuncMap{
		"stepIcon":  getStepIcon,
		"visualBar": generateVisualBar,
	}

	tmpl, err := textTpl.New("md").Funcs(funcMap).Parse(mdTemplate)
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, p); err != nil {
		return err
	}
	return os.WriteFile(filename, buf.Bytes(), 0644)
}

// --- 以下是 HTML 模板部分，保持你之前的代码即可 ---
const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{{.Plan.City}}出行方案</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="text/javascript" src="https://webapi.amap.com/maps?v=1.4.15&key={{.AMAP_API_KEY}}"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
        body { font-family: 'Noto Sans SC', sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
        #map-container { height: 380px; width: 100%; border-radius: 0 0 3rem 3rem; overflow: hidden; position: relative; z-index: 1;}
        .amap-logo, .amap-copyright { display: none !important; visibility: hidden !important; }
        .main-content { position: relative; z-index: 10; margin-top: -3rem; padding-bottom: 3rem; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .btn-active { background: white !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: #2563eb !important; transform: scale(1.05); }
        .marker-start { background: #3b82f6; color: white; padding: 4px 8px; border-radius: 12px 12px 12px 0; font-weight: 900; font-size: 12px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .marker-end { background: #10b981; color: white; padding: 4px 8px; border-radius: 12px 12px 12px 0; font-weight: 900; font-size: 12px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body class="text-slate-900">
    <div class="max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl relative">
        <div id="map-container"></div>
        <div class="main-content px-4">
            <header class="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white/50 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h1 class="text-2xl font-black text-slate-800 tracking-tight">{{.Plan.City}} 行程概览</h1>
                    <span class="bg-blue-50 text-blue-600 p-2 rounded-2xl text-xl">🗺️</span>
                </div>
                <div class="space-y-3">
                    <div class="flex items-start text-xs font-bold text-slate-500 italic">
                        <span class="w-4 h-4 mt-1 bg-blue-500 rounded-full border-4 border-blue-50 flex-shrink-0"></span>
                        <div class="ml-3 truncate">{{.Plan.Origin}}</div>
                    </div>
                    <div class="flex items-start text-xs font-bold text-slate-500 italic">
                        <span class="w-4 h-4 mt-1 bg-emerald-500 rounded-full border-4 border-emerald-50 flex-shrink-0"></span>
                        <div class="ml-3 truncate">{{.Plan.Destination}}</div>
                    </div>
                </div>
            </header>

            <section class="mb-8 overflow-hidden">
                <div class="flex space-x-3 overflow-x-auto no-scrollbar py-2 px-1">
                    {{range .Plan.WeatherList}}
                    <div class="min-w-[125px] bg-white rounded-3xl p-5 shadow-sm border border-white flex-shrink-0 text-center">
                        <p class="text-[9px] text-slate-400 mb-2 font-black tracking-tighter">{{.Date}}</p>
                        <p class="text-base font-black text-slate-800">{{.Condition}}</p>
                        <p class="text-[10px] text-blue-600 font-black mt-2 leading-none">{{.TempMin}}°/{{.TempMax}}°</p>
                    </div>
                    {{end}}
                </div>
            </section>

            <section class="mb-8">
                <div class="flex items-center justify-between mb-4 px-2">
                    <h2 class="text-lg font-black text-slate-800 italic">🚶 路线方案</h2>
                    <div class="flex bg-slate-200/50 backdrop-blur-sm rounded-2xl p-1 text-[10px] font-black">
                        {{range $mode, $opt := .Plan.RouteOptions}}
                        <button id="btn-{{$mode}}" onclick="window.switchMode('{{$mode}}')"
                                class="px-5 py-2 rounded-xl transition-all duration-300 text-slate-400 uppercase">
                            {{if eq $mode "driving"}}自驾{{else}}公交{{end}}
                        </button>
                        {{end}}
                    </div>
                </div>
                <div id="steps-card" class="bg-white p-7 rounded-[2.5rem] shadow-sm border border-white">
                    <div id="steps-list" class="space-y-0 text-left"></div>
                </div>
            </section>

            {{if .Plan.Tickets}}
            <section class="mb-8">
                <div class="px-2 mb-4 flex justify-between items-center text-lg font-black text-slate-800 italic">
                    <h2>🎫 门票预订</h2>
                </div>
                <div class="space-y-3 text-left">
                    {{range .Plan.Tickets}}
                    <a href="{{.URL}}" target="_blank" class="flex items-center p-5 bg-white rounded-[2.5rem] shadow-sm border-2 border-transparent active:border-blue-100 active:scale-[0.98] transition-all group">
                        <div class="bg-indigo-50 p-3 rounded-2xl mr-4 text-xl font-bold">📍</div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-black text-slate-800 truncate leading-none">{{.Name}}</p>
                            <p class="text-[10px] text-slate-400 mt-2 italic font-bold">官方预约链接</p>
                        </div>
                    </a>
                    {{end}}
                </div>
            </section>
            {{end}}
        </div>
    </div>

    <script>
        const routeData = {{.RouteJSON}};
        let map, polyline, markers = [];
        let firstMode = "";
        for(let k in routeData) { firstMode = k; break; }
        window.currentMode = routeData.driving ? 'driving' : firstMode;

        function initMap() {
            map = new AMap.Map('map-container', {
                zoom: 12,
                center: [121.47, 31.23],
                mapStyle: 'amap://styles/whitesmoke'
            });
            map.on('complete', function() {
                window.renderMode(window.currentMode);
            });
        }

        window.renderMode = function(mode) {
            const data = routeData[mode];
            if (!data || !data.polyline) return;
            if (polyline) polyline.setMap(null);
            markers.forEach(m => m.setMap(null));
            markers = [];

            const pathStrings = data.polyline.split(';').filter(p => p.length > 0);
            const path = pathStrings.map(p => {
                const lnglat = p.split(',');
                return new AMap.LngLat(parseFloat(lnglat[0]), parseFloat(lnglat[1]));
            });

            polyline = new AMap.Polyline({
                path: path,
                strokeColor: mode === 'driving' ? '#3b82f6' : '#10b981',
                strokeWeight: 6,
                lineJoin: 'round',
                showDir: true
            });
            polyline.setMap(map);

            const startM = new AMap.Marker({
                position: path[0],
                content: '<div class="marker-start">起</div>',
                offset: new AMap.Pixel(-10, -20)
            });
            const endM = new AMap.Marker({
                position: path[path.length - 1],
                content: '<div class="marker-end">终</div>',
                offset: new AMap.Pixel(-10, -20)
            });
            startM.setMap(map);
            endM.setMap(map);
            markers.push(startM, endM);

            map.setFitView([polyline, startM, endM], false, [60, 40, 100, 40]);
            updateUI(mode, data);
        };

        window.switchMode = function(mode) {
            window.currentMode = mode;
            window.renderMode(mode);
        };

        function updateUI(mode, data) {
            document.querySelectorAll('[id^="btn-"]').forEach(btn => {
                btn.id === "btn-" + mode ? btn.classList.add('btn-active') : btn.classList.remove('btn-active');
            });
            const list = document.getElementById('steps-list');
            list.innerHTML = data.steps.map(function(s, i) {
                var h = '<div class="flex relative mb-8 text-left">';
                h += '<div class="flex flex-col items-center mr-5 relative">';
                h += '<div class="w-4 h-4 rounded-full border-4 border-blue-500 bg-white z-10 shadow-sm"></div>';
                if (i < data.steps.length - 1) {
                    h += '<div style="position: absolute; left: 7px; top: 20px; width: 2px; height: 100%; background: #f1f5f9;"></div>';
                }
                h += '</div>';
                h += '<div class="flex-1">';
                h += '<p class="text-[14px] font-black text-slate-700 leading-tight">' + s.instruction + '</p>';
                h += '<p class="text-[10px] text-slate-400 mt-2 font-bold italic">' + s.distance + 'm · ' + s.duration + 'min</p>';
                h += '</div></div>';
                return h;
            }).join('');
        }
        window.onload = initMap;
    </script>
</body>
</html>
`
