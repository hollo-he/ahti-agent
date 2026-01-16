package route_get

// --- 数据结构 ---

// TravelOption 统一的输出结构
// RouteStep 代表行程中的一个具体环节
type RouteStep struct {
	Instruction string `json:"instruction"` // 操作指令：如“乘坐地铁2号线”
	DurationMin int    `json:"duration"`    // 该环节耗时（分钟）
	DistanceM   int    `json:"distance"`    // 该环节距离（米）
}

type TravelOption struct {
	Mode        string      `json:"mode"`
	DurationMin int         `json:"duration_min"`
	DistanceKm  string      `json:"distance_km"`
	Cost        string      `json:"cost"`
	Steps       []RouteStep `json:"steps"`
	Polyline    string      `json:"polyline"` // <--- 新增：用于存储整个路径的坐标串 (lng,lat;lng,lat...)
}
