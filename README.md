# 如水成文

来自 X 的写作提示词。静态网站，和图像站 [如水如画](https://wangningashui-netizen.github.io/ai-prompts/) 是一对。

托管在 GitHub Pages：从 `main` 分支**根目录**直接发布，没有构建步骤。界面是简体中文。打开页面就按时间从新到旧往下看，不必先选日期。右上角「跳到」只是滚到某一天。

可以搜索标题、摘要和提示词正文，用分类筛选，并在「时间」和「热度」之间切换。热度 = 点赞 + 收藏。长提示词可以展开，复制按钮会把原文放进剪贴板，并提示「已复制」。

本地预览（不要用 `file://` 打开，浏览器会拦截 `fetch`）：

```bash
python3 -m http.server 8080
```

然后访问 <http://127.0.0.1:8080/>。

GitHub Pages：仓库 Settings → Pages → Build and deployment → Deploy from a branch → Branch `main`、文件夹 `/ (root)`。根目录的空文件 `.nojekyll` 让 Pages 按原样提供 `data/`。资源都用相对路径，项目页 `https://<user>.github.io/<repo>/` 可以直接用。

## 每周更新只改 data/

**不要**为了加提示词去改 `index.html`、`styles.css`、`app.js`。只做这两件事：

1. 新建或覆盖 `data/YYYY-MM-DD.json`。
2. 更新 `data/index.json`：最新的一天放在数组最前面，`count` 等于这一天的 `entries.length`。

页面会读取索引里的每一个文件，再按 `createdAt` 排序。文件里的先后顺序写错也不会把旧帖排到新帖前面，但请仍然按当天时间从新到旧来写，方便人工核对。

### 按哪一天归档

用 `createdAt` 在 **Asia/Shanghai（UTC+8）** 的日历日，不是 UTC 日期。

`2026-10-26T23:14:09.000Z` 在北京时间是 2026-10-27 07:14，所以这条要放进 `data/2026-10-27.json`，不要放进 10 月 26 日。

一天一个文件。没有条目的日期不要建空文件。

## `data/index.json`

一个 JSON **数组**（不要包在 `{ "dates": ... }` 里），从新到旧：

```json
[
  { "date": "2026-11-02", "file": "2026-11-02.json", "count": 2 },
  { "date": "2026-11-01", "file": "2026-11-01.json", "count": 1 }
]
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | string | `YYYY-MM-DD`，北京时间的日历日，和文件名一致。 |
| `file` | string | 文件名，例如 `2026-11-02.json`。不要写成绝对路径，也不要以 `/` 开头。页面会到 `data/` 下读取。若写成 `data/2026-11-02.json` 也能读。 |
| `count` | number | 这一天 `entries.length`。页面按文件内容渲染，不用 `count` 截断列表；请保持一致，方便核对。 |

## `data/YYYY-MM-DD.json`

```json
{
  "schemaVersion": 1,
  "date": "2026-10-29",
  "timezone": "Asia/Shanghai",
  "entries": [
    {
      "id": "2115508795493236863",
      "title": "定价文案十秒读懂",
      "category": "文案",
      "summary": "把定价说明改写到首次客户十秒内能看懂，减少困惑私信。",
      "prompt": "Here's my pricing text: [paste]. Rewrite it so a first-time customer understands it in 10 seconds.",
      "lang": "en",
      "author": "maged_hampoop",
      "authorName": "Maged Hammo",
      "url": "https://x.com/maged_hampoop/status/2115508795493236863",
      "createdAt": "2026-10-28T18:19:35.000Z",
      "likes": 1,
      "bookmarks": 0
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schemaVersion` | number | 是 | 固定数字 `1`，不要写成字符串。 |
| `date` | string | 是 | `YYYY-MM-DD`，与文件名、索引里的 `date` 相同。 |
| `timezone` | string | 是 | 固定 `Asia/Shanghai`。 |
| `entries` | array | 是 | 这一天的条目。可以是空数组，但空日子不必建文件。 |
| `entries[].id` | **string** | 是 | X 帖子 id。必须是 JSON 字符串。雪花 id 超过 `Number.MAX_SAFE_INTEGER`，写成数字会丢精度，原帖会对错。 |
| `entries[].title` | string | 是 | 简体中文标题。 |
| `entries[].category` | string | 是 | 已知值：`润色`、`文案`、`小红书`、`剧本`、`演讲`、`邮件`、`内容矩阵`、`其他`。不要加空格。新的分类名会自动出现在筛选条末尾，不用改页面。 |
| `entries[].summary` | string | 是 | 一行中文摘要。 |
| `entries[].prompt` | string | 是 | 提示词原文。保留换行、标点和语言，不要翻译、不要删改、不要截断。 |
| `entries[].lang` | string | 是 | 提示词语言。本批使用 `zh` 或 `en`。页面把 `zh`/`en`/`ja`/`ko` 显示成中文、英文、日文、韩文，其它代码原样大写显示。 |
| `entries[].author` | string | 是 | X 用户名，不含 `@`。 |
| `entries[].authorName` | string | 否 | 显示名。没有就省略这个字段。 |
| `entries[].url` | string | 是 | 原帖链接，形如 `https://x.com/<author>/status/<id>`。 |
| `entries[].createdAt` | string | 是 | 发帖时间，UTC 的 ISO-8601，例如 `2026-10-28T18:19:35.000Z`。页面自己换成北京时间。 |
| `entries[].likes` | number | 是 | 点赞，整数 ≥ 0。 |
| `entries[].bookmarks` | number | 是 | 收藏，整数 ≥ 0。 |

未知字段可以留着，当前页面会忽略。不要改已有字段的类型。

页面行为（加数据时不用改代码）：

- 默认按 `createdAt` 从新到旧，并用日期标题分成一天一天。同一时间再按 `id` 字符串从大到小。
- 「热度」按 `likes + bookmarks` 从高到低，相同则仍按时间、再按 `id`。
- 搜索只匹配标题、摘要、提示词，不区分大小写，不匹配作者。
- 分类是单选。芯片上的数字是当前搜索结果里的条数。
- 「复制提示词」复制完整 `prompt`。原文里的换行会保留。
- 「查看原帖」打开条目里的 `url`。作者名指向 `https://x.com/<author>`。

## 首批数据

2026-10-26 至 2026-11-02（北京时间），25 条，按 `createdAt` 的北京时间日历日拆开：

| 日期 | 条数 |
| --- | --- |
| 2026-11-02 | 2 |
| 2026-11-01 | 1 |
| 2026-10-31 | 7 |
| 2026-10-30 | 2 |
| 2026-10-29 | 3 |
| 2026-10-28 | 3 |
| 2026-10-27 | 4 |
| 2026-10-26 | 3 |

其中三条的 UTC 日期和北京时间不是同一天（`2026-10-26T23:14:09Z` → 10-27，`2026-10-28T16:02:17Z` 与 `2026-10-28T18:19:35Z` → 10-29）。提示词文本与采集稿一致，没有改写。

## Update checklist

Do only this. Do not edit `index.html`, `styles.css`, or `app.js` for new prompts.

1. Add `data/YYYY-MM-DD.json` with `schemaVersion` `1`, `timezone` `"Asia/Shanghai"`, and `entries`. `date` matches the file name.
2. Bucket each post by the **Asia/Shanghai calendar date** of `createdAt`, not the UTC date. `2026-10-26T23:14:09.000Z` belongs in `2026-10-27.json`.
3. Keep `id` a JSON string. Keep `prompt` verbatim, including newlines. Do not translate it.
4. Prepend `{ "date", "file", "count" }` to the `data/index.json` array (`file` is `YYYY-MM-DD.json`, `count` is `entries.length`). Newest day first.

The page loads every file in that array, sorts newest-first by default, and can resort by heat (`likes + bookmarks`). Search matches title, summary, and prompt. A category string outside the built-in list still shows up as its own chip.
