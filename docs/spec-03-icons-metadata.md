# Spec-03：平台图标元数据草稿（42 平台）

> 工人：DeepSeek Flash（机械整理，地板价通道）｜验收：Claude 本体 + 人工核色
> 产出：`docs/design/platform-icons-draft.jsonl`。**此产出仅为草稿**——DeepSeek 幻觉偏高（model-notes 记录在案），品牌色与 simple-icons 收录情况必须在 spec-10 阶段逐条对照官方资料核验后才可进入 `packages/icons`。

## 给 DeepSeek 的指令（ds 脚本直接投喂本节）

你是数据整理助手。只输出 JSONL（每行一个 JSON 对象），不要任何解释文字、不要 markdown 代码块标记。为下列 42 个平台各输出一行，字段：

- `id`：小写 kebab-case 英文标识（按清单括号内给定值）
- `nameZh`：中文名
- `nameEn`：英文名
- `category`：`social` | `video` | `music` | `shopping` | `dev` | `content` | `contact` | `other` 之一
- `brandColorHex`：官方主品牌色十六进制（如 `#07C160`）；**不确定就填 null，严禁编造**
- `aliases`：中文常用别名/搜索词数组（≥1 个）
- `hasSimpleIcon`：simple-icons 图标库是否收录该品牌，`true`/`false`，不确定填 null

输出顺序与清单一致。清单：

微信(wechat)、微信公众号(wechat-official-account)、微信视频号(wechat-channels)、企业微信(wecom)、QQ(qq)、抖音(douyin)、小红书(xiaohongshu)、哔哩哔哩(bilibili)、快手(kuaishou)、微博(weibo)、知乎(zhihu)、即刻(jike)、豆瓣(douban)、得物(dewu)、淘宝(taobao)、京东(jd)、拼多多(pinduoduo)、闲鱼(goofish)、网易云音乐(netease-cloud-music)、QQ音乐(qq-music)、小宇宙(xiaoyuzhou)、喜马拉雅(ximalaya)、GitHub(github)、掘金(juejin)、CSDN(csdn)、少数派(sspai)、V2EX(v2ex)、电子邮件(email)、电话(phone)、个人网站(website)、TikTok(tiktok)、Instagram(instagram)、YouTube(youtube)、X/Twitter(x)、Facebook(facebook)、LinkedIn(linkedin)、Telegram(telegram)、WhatsApp(whatsapp)、Discord(discord)、Spotify(spotify)、Twitch(twitch)、Threads(threads)
