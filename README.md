# 如水成文

来自 X 的写作提示词，以及写作相关的仓库推荐。静态网站，和图像站 [如水如画](https://wangningashui-netizen.github.io/ai-prompts/) 是一对。

托管在 GitHub Pages：从 `main` 分支**根目录**直接发布，没有构建步骤。界面是简体中文。打开页面默认是「提示词」，按时间从新到旧往下看，不必先选日期。顶栏可以切到「仓库推荐」。`#prompts` 和 `#repos` 都能单独打开。右上角「跳到」只是滚到某一天。

提示词可以搜索标题、摘要和正文，用分类筛选，并在「时间」和「热度」之间切换。热度 = 点赞 + 收藏。长提示词可以展开，复制按钮会把原文放进剪贴板，并提示「已复制」。仓库推荐用另一套分类，可以按时间、星标或热度排序；热度 = 点赞 + 转发 + 收藏。

本地预览（不要用 `file://` 打开，浏览器会拦截 `fetch`）：

```bash
python3 -m http.server 8080
```

然后访问 <http://127.0.0.1:8080/>。

GitHub Pages：仓库 Settings → Pages → Build and deployment → Deploy from a branch → Branch `main`、文件夹 `/ (root)`。根目录的空文件 `.nojekyll` 让 Pages 按原样提供 `data/`。资源都用相对路径，项目页 `https://<user>.github.io/<repo>/` 可以直接用。

## 每周更新只改 data/

**不要**为了加内容去改 `index.html`、`styles.css`、`app.js`。提示词和仓库是两套文件，互不影响。

### 提示词

只做这两件事：

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

## 仓库推荐 `data/repos/`

和提示词同一套习惯：一个索引，再加按北京时间日历日拆开的文件。页面默认不显示这里，地址换成 `#repos` 才会打开。

1. 新建或覆盖 `data/repos/YYYY-MM-DD.json`。
2. 更新 `data/repos/index.json`：最新的一天放在数组最前面，`count` 等于这一天的 `entries.length`。

一天用 `createdAt` 的 **Asia/Shanghai** 日历日，不是 UTC。`2026-10-25T23:00:12.000Z` 在北京时间是 2026-10-26 07:00，写入 `data/repos/2026-10-26.json`。

同一条 X 帖子可以推荐好几个仓库。每条记录的 `id` 仍是帖子 id，所以 **id 可以重复**。页面用 `repo.fullName` 当唯一键。同一个仓库若出现在多天的文件里，只保留 `createdAt` 更新的那条。

### `data/repos/index.json`

JSON 数组，从新到旧。`file` 只写文件名，页面到 `data/repos/` 下读取。

```json
[
  { "date": "2026-11-02", "file": "2026-11-02.json", "count": 2 },
  { "date": "2026-11-01", "file": "2026-11-01.json", "count": 7 }
]
```

### `data/repos/YYYY-MM-DD.json`

```json
{
  "schemaVersion": 1,
  "date": "2026-11-02",
  "timezone": "Asia/Shanghai",
  "entries": [
    {
      "id": "2117101947928870969",
      "url": "https://x.com/Daviswh/status/2117101947928870969",
      "author": { "name": "daviswu", "username": "Daviswh" },
      "createdAt": "2026-11-02T03:50:12.000Z",
      "titleZh": "中文小说创作 Skill",
      "summaryZh": "AI 写中文长篇的流水线 Skill：从题材、人物、大纲到逐章写作与埋钩子，支持创作记忆和中断续写，可生成 10–50 章小说。适合打算连载网文的人。",
      "category": "写作",
      "postText": "想用 AI 写中文长篇、又怕写到中段人物崩、伏笔忘的人：可先看流水线 Skill。\n\n@0xGky：开源 chinese-novelist-skill（约 3.4K★），从题材/人物/大纲到逐章写作、衔接与埋钩，支持创作记忆、中断续写与多 Agent 并行；每章目标约 3000–5000 字。GitHub：https://t.co/ETzASqUR8x\n\n判断：准备连更 10 章以上的人适合装；别指望一次吐完 50 章不审——每章先定小目标与收尾钩子，再放权给 Skill。",
      "repo": {
        "fullName": "PenglongHuang/chinese-novelist-skill",
        "url": "https://github.com/PenglongHuang/chinese-novelist-skill",
        "description": "🎭 AI 写小说：从零生成 10-50 章完整中文小说，三层问答 · 创作记忆 · 悬念钩子 · 自动校验，长篇网文连载皆宜｜开源免费，适配主流 coding agent｜🤝 Infistar.cc 赞助 · 注册送 $5｜AI novel writing skill",
        "stars": 4571,
        "language": "JavaScript",
        "pushedAt": "2026-11-01T13:40:52Z"
      },
      "metrics": {
        "likes": 1,
        "reposts": 0,
        "replies": 0,
        "bookmarks": 0,
        "quotes": 0,
        "impressions": 182
      },
      "otherSourceIds": []
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schemaVersion` | number | 是 | 固定数字 `1`。 |
| `date` | string | 是 | `YYYY-MM-DD`，与文件名一致。 |
| `timezone` | string | 是 | 固定 `Asia/Shanghai`。 |
| `entries` | array | 是 | 这一天推荐的仓库。 |
| `entries[].id` | **string** | 是 | 来源 X 帖子 id。不是唯一键，一条帖子可以对应多个仓库。必须是 JSON 字符串。 |
| `entries[].url` | string | 是 | 来源帖链接。 |
| `entries[].author.name` | string | 是 | 显示名。没有就写 `""`。 |
| `entries[].author.username` | string | 是 | X 用户名，不含 `@`。 |
| `entries[].createdAt` | string | 是 | 帖子时间，UTC ISO-8601。 |
| `entries[].titleZh` | string | 是 | 简体中文标题。 |
| `entries[].summaryZh` | string | 是 | 一行中文摘要。 |
| `entries[].category` | string | 是 | 已知值：`写作`、`效率`、`研究`、`内容创作`、`通用合集`、`开发`。新分类会自动出现在筛选条末尾。 |
| `entries[].postText` | string | 是 | 帖子原文，保留换行，不要翻译或删改。页面默认收起。 |
| `entries[].repo.fullName` | string | 是 | `owner/name`。跨文件去重就看这个字段。 |
| `entries[].repo.url` | string | 是 | `https://github.com/owner/name`。复制按钮复制的就是它。 |
| `entries[].repo.description` | string | 是 | GitHub 简介。没有就 `""`。 |
| `entries[].repo.stars` | number | 是 | 星标数，整数 ≥ 0。 |
| `entries[].repo.language` | string 或 null | 否 | 仓库语言。没有就 `null`。 |
| `entries[].repo.pushedAt` | string | 否 | 最近推送时间。没有就 `""`。 |
| `entries[].metrics` | object | 是 | `likes`、`reposts`、`replies`、`bookmarks`、`quotes`、`impressions`，都是整数 ≥ 0。 |
| `entries[].otherSourceIds` | array | 是 | 其他也提到这个仓库的帖子 id（字符串）。没有就 `[]`。 |

页面行为（加仓库时不用改代码）：

- 默认按 `createdAt` 从新到旧，并用日期标题分成一天一天。同一时间保持文件里的先后。
- 「星标」按 `repo.stars` 从高到低。
- 「热度」按 `metrics.likes + metrics.reposts + metrics.bookmarks` 从高到低。热度相同再看时间，还相同就看星标。
- 搜索匹配 `titleZh`、`summaryZh`、`repo.fullName`、`repo.description`，不区分大小写。
- 同一个 `repo.fullName` 只显示一次，留 `createdAt` 较新的那条。
- 「打开仓库」打开 `repo.url`。「复制链接」复制这个 URL，并提示「已复制」。
- 来源行是 `@username` 加北京时间，链到帖子 `url`。

首批仓库是 2026-10-26 至 2026-11-02（北京时间），31 个，没有重复的 `fullName`：

| 日期 | 个数 |
| --- | --- |
| 2026-11-02 | 2 |
| 2026-11-01 | 7 |
| 2026-10-31 | 2 |
| 2026-10-30 | 7 |
| 2026-10-29 | 2 |
| 2026-10-27 | 2 |
| 2026-10-26 | 9 |

## 首批提示词

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

### Repos

Do not edit the page shell for new repositories either.

1. Add `data/repos/YYYY-MM-DD.json` with `schemaVersion` `1`, `timezone` `"Asia/Shanghai"`, and `entries`. Bucket by the Asia/Shanghai calendar date of `createdAt`. `2026-10-25T23:00:12.000Z` belongs in `data/repos/2026-10-26.json`.
2. `id` is the source post id as a JSON string. It is **not** unique: one post may recommend several repos. The key is `repo.fullName`.
3. Keep `postText`, `titleZh`, and `summaryZh` verbatim. `repo.stars` and every `metrics` field are integers.
4. Prepend `{ "date", "file", "count" }` to the `data/repos/index.json` array (`file` is `YYYY-MM-DD.json`, `count` is `entries.length`). Newest day first.

The page dedupes by `repo.fullName` and keeps the entry with the newer `createdAt`. Default sort is newest-first. Star sort uses `repo.stars`. Heat is `likes + reposts + bookmarks`. Search matches `titleZh`, `summaryZh`, `repo.fullName`, and `repo.description`. Open `#repos` for this tab; `#prompts` or a bare URL is the prompt feed.
