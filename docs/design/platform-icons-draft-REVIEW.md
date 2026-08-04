# platform-icons-draft.jsonl 验收备注（2026-08-04，Claude 本体）

结构验收：**通过**——42/42 行合法 JSON、必填字段齐全、顺序与 spec-03 清单一致。

抽查发现的可信度问题（spec-10 实装前必须逐条核验）：

1. **`hasSimpleIcon` 系统性过度自信**：抽样中 jike/dewu/xiaoyuzhou/sspai 全为 `true`，而 simple-icons 大概率未收录这些小众国内品牌。→ 该字段视为无效，spec-10 直接用 `simple-icons` npm 包程序化比对，不采信本字段。
2. **个别色值疑似张冠李戴**：`dewu` 填 `#FE2C55`（这是抖音/TikTok 的红），得物官方视觉是青色系。→ 全部 `brandColorHex` 需对照官方物料/simple-icons 数据核验，国内平台优先以官方 App 图标取色。
3. 抽查正确项：wechat `#07C160`、bilibili `#FB7299`、github `#181717`、zhihu `#0084FF` 均与 simple-icons 一致；`aliases` 质量可用。

结论：可作为 spec-10 的输入草稿；`nameZh/nameEn/category/aliases` 基本可信，`brandColorHex/hasSimpleIcon` 一律待核。
