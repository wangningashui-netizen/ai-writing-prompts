/* 如水成文
   提示词来自 data/index.json 与 data/YYYY-MM-DD.json。
   仓库推荐来自 data/repos/index.json 与 data/repos/YYYY-MM-DD.json。
   更新内容时不要改这个文件。
*/
(function () {
  var PROMPT_CATS = ["润色", "文案", "小红书", "剧本", "演讲", "邮件", "内容矩阵", "其他"];
  var REPO_CATS = ["写作", "效率", "研究", "内容创作", "通用合集", "开发"];
  var LANG = { zh: "中文", en: "英文", ja: "日文", ko: "韩文" };

  function freshBag() {
    return {
      entries: [],
      q: "",
      category: "全部",
      sort: "time",
      open: new Set(),
      ready: false,
      error: ""
    };
  }

  var state = {
    view: "prompts",
    prompts: freshBag(),
    repos: freshBag()
  };

  var feed = document.getElementById("feed");
  var chipsEl = document.getElementById("chips");
  var resultEl = document.getElementById("result");
  var qInput = document.getElementById("q");
  var clearBtn = document.getElementById("clear");
  var jump = document.getElementById("jump");
  var toastEl = document.getElementById("toast");
  var toTop = document.getElementById("to-top");
  var qLabel = document.querySelector("label[for='q']");
  var toastTimer = 0;

  function active() {
    return state.view === "repos" ? state.repos : state.prompts;
  }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) return;
        if (key === "class") el.className = value;
        else if (key === "text") el.textContent = value;
        else el.setAttribute(key, value === true ? "" : String(value));
      });
    }
    function place(child) {
      if (child == null || child === false) return;
      if (Array.isArray(child)) {
        child.forEach(place);
        return;
      }
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    Array.prototype.slice.call(arguments, 2).forEach(place);
    return el;
  }

  function icon(name) {
    var paths = {
      heart: "M12 19.4s-6.4-3.9-6.4-8.2a3.6 3.6 0 0 1 6.4-1.8 3.6 3.6 0 0 1 6.4 1.8c0 4.3-6.4 8.2-6.4 8.2z",
      bookmark: "M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.5a1 1 0 0 1 1-1z"
    };
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "ico");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[name]);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.7");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    svg.append(path);
    return svg;
  }

  function motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function resolveFile(file, root) {
    var name = String(file || "").replace(/^\//, "");
    if (!name || name.indexOf("..") !== -1) throw new Error("非法数据路径");
    if (name.indexOf("data/") === 0) return name;
    return root + name;
  }

  function getJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error(url + " " + res.status);
      return res.json();
    });
  }

  function timeValue(iso) {
    var t = Date.parse(iso);
    return isFinite(t) ? t : 0;
  }

  function heatValue(entry) {
    return (Number(entry.likes) || 0) + (Number(entry.bookmarks) || 0);
  }

  function repoHeat(entry) {
    var metrics = entry.metrics || {};
    return (Number(metrics.likes) || 0) + (Number(metrics.reposts) || 0) + (Number(metrics.bookmarks) || 0);
  }

  function starCount(entry) {
    return Number(entry.repo && entry.repo.stars) || 0;
  }

  function formatStars(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    if (n < 1000) return String(n);
    if (n < 1000000) {
      var value = n / 1000;
      var text = value >= 100
        ? String(Math.round(value))
        : (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
      return text + "k";
    }
    return (Math.round(n / 100000) / 10).toFixed(1).replace(/\.0$/, "") + "m";
  }

  function langLabel(code) {
    var key = String(code || "").toLowerCase();
    return LANG[key] || (key ? key.toUpperCase() : "");
  }

  function safeUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch (e) {}
    return "";
  }

  function authorHref(entry) {
    if (/^[A-Za-z0-9_]{1,30}$/.test(entry.author || "")) {
      return "https://x.com/" + entry.author;
    }
    return safeUrl(entry.url);
  }

  function shanghaiParts(iso) {
    var fmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    var parts = {};
    fmt.formatToParts(new Date(iso)).forEach(function (part) {
      if (part.type !== "literal") parts[part.type] = part.value;
    });
    return parts;
  }

  function formatTime(iso) {
    if (!iso || !isFinite(Date.parse(iso))) return "";
    var parts = shanghaiParts(iso);
    return Number(parts.month) + "月" + Number(parts.day) + "日 " + parts.hour + ":" + parts.minute;
  }

  function weekdayOf(date) {
    var noon = new Date(date + "T04:00:00Z");
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      weekday: "long"
    }).format(noon);
  }

  function dayHeading(date) {
    var bits = date.split("-").map(Number);
    return bits[0] + "年" + bits[1] + "月" + bits[2] + "日 · " + weekdayOf(date);
  }

  function categoriesOf(entries, preferred) {
    var extra = [];
    entries.forEach(function (entry) {
      var cat = entry.category;
      if (cat && preferred.indexOf(cat) === -1 && extra.indexOf(cat) === -1) extra.push(cat);
    });
    extra.sort(function (a, b) { return a.localeCompare(b, "zh"); });
    return ["全部"].concat(preferred, extra);
  }

  function promptHit(entry, q) {
    if (!q) return true;
    var hay = [entry.title, entry.summary, entry.prompt].join("\n").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function repoHit(entry, q) {
    if (!q) return true;
    var repo = entry.repo || {};
    var hay = [entry.titleZh, entry.summaryZh, repo.fullName, repo.description].join("\n").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function orderedPrompts(list) {
    var sort = state.prompts.sort;
    var out = list.slice();
    out.sort(function (a, b) {
      if (sort === "heat") {
        var byHeat = heatValue(b) - heatValue(a);
        if (byHeat) return byHeat;
      }
      var byTime = timeValue(b.createdAt) - timeValue(a.createdAt);
      if (byTime) return byTime;
      if (a.id === b.id) return 0;
      return a.id < b.id ? 1 : -1;
    });
    return out;
  }

  function orderedRepos(list) {
    var sort = state.repos.sort;
    var out = list.slice();
    out.sort(function (a, b) {
      if (sort === "heat") {
        var byHeat = repoHeat(b) - repoHeat(a);
        if (byHeat) return byHeat;
      } else if (sort === "stars") {
        var byStars = starCount(b) - starCount(a);
        if (byStars) return byStars;
      }
      var byTime = timeValue(b.createdAt) - timeValue(a.createdAt);
      if (byTime) return byTime;
      if (sort === "time") return 0;
      var starTie = starCount(b) - starCount(a);
      if (starTie) return starTie;
      var left = (a.repo && a.repo.fullName) || "";
      var right = (b.repo && b.repo.fullName) || "";
      if (left === right) return 0;
      return left < right ? -1 : 1;
    });
    return out;
  }

  function groupByDay(list) {
    var groups = [];
    var map = new Map();
    list.forEach(function (entry) {
      var key = entry.day || "unknown";
      if (!map.has(key)) {
        var group = { day: key, entries: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).entries.push(entry);
    });
    return groups;
  }

  function dedupeRepos(entries) {
    var best = new Map();
    entries.forEach(function (entry) {
      var name = entry.repo && entry.repo.fullName;
      if (!name) return;
      var prev = best.get(name);
      if (!prev || timeValue(entry.createdAt) > timeValue(prev.createdAt)) best.set(name, entry);
    });
    return Array.from(best.values());
  }

  function syncSticky() {
    var bar = document.querySelector(".toolbar");
    if (!bar) return;
    document.documentElement.style.setProperty("--sticky-h", bar.offsetHeight + "px");
  }

  function syncSort() {
    var sort = active().sort;
    document.querySelectorAll(".sort button").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.dataset.sort === sort));
    });
  }

  function syncChrome() {
    var bag = active();
    var repos = state.view === "repos";
    if (qInput.value !== bag.q) qInput.value = bag.q;
    clearBtn.hidden = !bag.q;
    var placeholder = repos ? "搜索仓库、标题或摘要" : "搜索标题、摘要或提示词";
    qInput.placeholder = placeholder;
    if (qLabel) qLabel.textContent = placeholder;
    document.getElementById("sort-stars").hidden = !repos;
    document.querySelector(".sort").classList.toggle("has-stars", repos);
    document.getElementById("tab-prompts").setAttribute("aria-selected", String(!repos));
    document.getElementById("tab-repos").setAttribute("aria-selected", String(repos));
    syncSort();
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("on");
    }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return copyFallback(text);
      });
    }
    return Promise.resolve(copyFallback(text));
  }

  function copyFallback(text) {
    try {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      area.setSelectionRange(0, text.length);
      var ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  function fillJump() {
    var entries = active().entries;
    var seen = [];
    entries.forEach(function (entry) {
      if (entry.day && seen.indexOf(entry.day) === -1) seen.push(entry.day);
    });
    seen.sort(function (a, b) { return a < b ? 1 : -1; });
    jump.replaceChildren(h("option", { value: "", text: "选择日期" }));
    var newestYear = seen.length ? seen[0].slice(0, 4) : "";
    seen.forEach(function (day) {
      var count = entries.filter(function (entry) { return entry.day === day; }).length;
      var bits = day.split("-").map(Number);
      var label = (day.slice(0, 4) === newestYear ? "" : bits[0] + "年") + bits[1] + "月" + bits[2] + "日 · " + count + "条";
      jump.append(h("option", { value: day, text: label }));
    });
    jump.value = "";
  }

  function renderChips(allEntries, searched, preferred) {
    var bag = active();
    var counts = new Map();
    searched.forEach(function (entry) {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    });
    var cats = categoriesOf(allEntries, preferred);
    if (cats.indexOf(bag.category) === -1) bag.category = "全部";
    var left = chipsEl.scrollLeft;
    chipsEl.replaceChildren();
    cats.forEach(function (cat) {
      var n = cat === "全部" ? searched.length : (counts.get(cat) || 0);
      var btn = h("button", {
        type: "button",
        class: "chip",
        "data-category": cat,
        "aria-pressed": String(bag.category === cat)
      }, cat);
      btn.append(h("span", { class: "chip-count", text: String(n) }));
      chipsEl.append(btn);
    });
    chipsEl.scrollLeft = left;
    var current = chipsEl.querySelector('[aria-pressed="true"]');
    if (!current) return;
    var chipBox = current.getBoundingClientRect();
    var rowBox = chipsEl.getBoundingClientRect();
    if (chipBox.left < rowBox.left || chipBox.right > rowBox.right - 4) {
      chipsEl.scrollLeft += chipBox.left - rowBox.left - Math.max(0, (rowBox.width - chipBox.width) / 2);
    }
  }

  function renderResult(count) {
    var bag = active();
    var bits = [sortWord(bag.sort)];
    if (bag.category !== "全部") bits.push(bag.category);
    var q = bag.q.trim();
    if (q) bits.push("“" + q + "”");
    bits.push(count + " 条");
    resultEl.textContent = bits.join(" · ");
  }

  function sortWord(sort) {
    if (sort === "heat") return "按热度";
    if (sort === "stars") return "按星标";
    return "最新在前";
  }

  function cardView(entry) {
    var open = state.prompts.open.has(entry.id);
    var card = h("article", { class: "card" + (open ? " is-open" : ""), "data-id": entry.id });
    var catBtn = h("button", {
      type: "button",
      class: "cat",
      "data-pick": entry.category || "",
      "aria-pressed": String(state.prompts.category === entry.category)
    }, entry.category || "未分类");
    var lang = langLabel(entry.lang);
    card.append(h("div", { class: "kicker" }, catBtn, lang ? h("span", { class: "lang", text: lang }) : null));
    card.append(h("h3", { text: entry.title || "未命名" }));
    if (entry.summary) card.append(h("p", { class: "summary", text: entry.summary }));

    var prompt = h("div", { class: "prompt" + (open ? "" : " is-clamped"), "data-id": entry.id });
    if (entry.lang) prompt.lang = entry.lang;
    prompt.textContent = entry.prompt || "";
    card.append(prompt);
    card.append(h("button", {
      type: "button",
      class: "expand",
      "data-expand": entry.id,
      "aria-expanded": String(open),
      hidden: true
    }, open ? "收起" : "展开全文"));

    var post = safeUrl(entry.url);
    var source = post
      ? h("a", { class: "btn", href: post, target: "_blank", rel: "noopener noreferrer" }, "查看原帖")
      : null;
    card.append(h("div", { class: "actions" },
      h("button", {
        type: "button",
        class: "btn btn-primary",
        "data-copy": entry.id,
        "data-idle": "复制提示词"
      }, "复制提示词"),
      source
    ));

    var likes = Number(entry.likes) || 0;
    var bookmarks = Number(entry.bookmarks) || 0;
    var who = entry.authorName || (entry.author ? "@" + entry.author : "");
    var whoHref = authorHref(entry);
    var whoEl = who
      ? (whoHref
        ? h("a", { class: "author", href: whoHref, target: "_blank", rel: "noopener noreferrer" }, who)
        : h("span", { class: "author", text: who }))
      : null;
    var when = formatTime(entry.createdAt);
    card.append(h("div", { class: "meta" },
      h("span", { class: "stat" }, icon("heart"), String(likes), h("span", { class: "sr", text: "次点赞" })),
      h("span", { class: "stat" }, icon("bookmark"), String(bookmarks), h("span", { class: "sr", text: "次收藏" })),
      when ? h("time", { class: "when", datetime: entry.createdAt || "", text: when }) : null,
      whoEl
    ));
    return card;
  }

  function repoCard(entry) {
    var repo = entry.repo || {};
    var key = repo.fullName || entry.id;
    var open = state.repos.open.has(key);
    var card = h("article", {
      class: "card" + (open ? " is-open" : ""),
      "data-kind": "repo",
      "data-repo": key
    });
    var stars = starCount(entry);
    card.append(h("div", { class: "kicker" },
      h("button", {
        type: "button",
        class: "cat",
        "data-pick": entry.category || "",
        "aria-pressed": String(state.repos.category === entry.category)
      }, entry.category || "未分类"),
      h("span", { class: "star", title: stars + " 星" },
        h("span", { class: "mark", "aria-hidden": "true" }, "★"),
        formatStars(stars),
        h("span", { class: "sr", text: stars + " 星标" })
      )
    ));
    card.append(h("h3", { text: entry.titleZh || key || "未命名仓库" }));
    if (key) card.append(h("p", { class: "repo-name", text: key }));
    if (entry.summaryZh) card.append(h("p", { class: "summary", text: entry.summaryZh }));

    if (entry.postText) {
      var post = h("div", { class: "post-text", hidden: !open });
      post.textContent = entry.postText;
      card.append(post);
      card.append(h("button", {
        type: "button",
        class: "expand",
        "data-expand": key,
        "aria-expanded": String(open)
      }, open ? "收起" : "展开原文"));
    }

    var repoUrl = safeUrl(repo.url);
    var openLink = repoUrl
      ? h("a", { class: "btn btn-primary", href: repoUrl, target: "_blank", rel: "noopener noreferrer" }, "打开仓库")
      : null;
    var copyBtn = repoUrl
      ? h("button", {
        type: "button",
        class: "btn",
        "data-copy-url": repoUrl,
        "data-idle": "复制链接"
      }, "复制链接")
      : null;
    card.append(h("div", { class: "actions" }, openLink, copyBtn));

    var username = entry.author && entry.author.username;
    var when = formatTime(entry.createdAt);
    var sourceText = (username ? "@" + username : "原帖") + (when ? " · " + when : "");
    var postUrl = safeUrl(entry.url);
    var source = postUrl
      ? h("a", { class: "source", href: postUrl, target: "_blank", rel: "noopener noreferrer" }, sourceText)
      : h("span", { class: "source", text: sourceText });
    card.append(h("div", { class: "meta" }, source));
    return card;
  }

  function syncClamps() {
    feed.querySelectorAll(".prompt").forEach(function (el) {
      var id = el.dataset.id;
      var btn = el.parentElement.querySelector("[data-expand]");
      var card = el.closest(".card");
      if (!btn || !card) return;
      var open = state.prompts.open.has(id);
      el.classList.remove("is-clamped");
      var full = el.scrollHeight;
      el.classList.add("is-clamped");
      var clamped = el.clientHeight;
      var over = full > clamped + 8;
      el.classList.toggle("is-clamped", !open && over);
      card.classList.toggle("is-open", open);
      btn.hidden = !over;
      btn.textContent = open ? "收起" : "展开全文";
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  function paintDays(list, makeCard) {
    if (active().sort !== "time") {
      feed.append(h("div", { class: "cards" }, list.map(makeCard)));
      return;
    }
    groupByDay(list).forEach(function (group) {
      feed.append(h("section", { class: "day", id: "day-" + group.day },
        h("h2", { class: "day-head" },
          h("span", { class: "day-label", text: dayHeading(group.day) }),
          h("span", { class: "day-count", text: group.entries.length + " 条" })
        ),
        h("div", { class: "cards" }, group.entries.map(makeCard))
      ));
    });
  }

  function renderEmpty(noun) {
    feed.append(h("div", { class: "empty" },
      h("p", { text: "没有匹配的" + noun }),
      h("button", { type: "button", class: "btn", id: "reset" }, "清除筛选")
    ));
  }

  function renderPrompts() {
    var bag = state.prompts;
    var q = bag.q.trim().toLowerCase();
    var searched = bag.entries.filter(function (entry) { return promptHit(entry, q); });
    renderChips(bag.entries, searched, PROMPT_CATS);
    var shown = orderedPrompts(bag.category === "全部"
      ? searched
      : searched.filter(function (entry) { return entry.category === bag.category; }));
    renderResult(shown.length);
    feed.replaceChildren();
    if (!bag.entries.length) {
      feed.append(h("p", { class: "status", text: "还没有提示词。" }));
      return;
    }
    if (!shown.length) {
      renderEmpty("提示词");
      return;
    }
    paintDays(shown, cardView);
    syncClamps();
  }

  function renderRepos() {
    var bag = state.repos;
    var q = bag.q.trim().toLowerCase();
    var searched = bag.entries.filter(function (entry) { return repoHit(entry, q); });
    renderChips(bag.entries, searched, REPO_CATS);
    var shown = orderedRepos(bag.category === "全部"
      ? searched
      : searched.filter(function (entry) { return entry.category === bag.category; }));
    renderResult(shown.length);
    feed.replaceChildren();
    if (!bag.entries.length) {
      feed.append(h("p", { class: "status", text: "还没有仓库。" }));
      return;
    }
    if (!shown.length) {
      renderEmpty("仓库");
      return;
    }
    paintDays(shown, repoCard);
  }

  function showError(which, message) {
    feed.replaceChildren(h("div", { class: "empty" },
      h("p", { text: which === "repos" ? "仓库没有载入。" : "提示词没有载入。" }),
      h("p", { class: "fine", text: message }),
      h("button", { type: "button", class: "btn", "data-retry": which }, "重试")
    ));
    resultEl.textContent = "";
  }

  function render() {
    syncChrome();
    var bag = active();
    if (!bag.ready) {
      if (bag.error && state.view === (bag === state.repos ? "repos" : "prompts")) {
        showError(state.view, bag.error);
        return;
      }
      feed.replaceChildren(h("p", { class: "status", text: "正在加载…" }));
      resultEl.textContent = "正在加载…";
      chipsEl.replaceChildren();
      return;
    }
    if (state.view === "repos") renderRepos();
    else renderPrompts();
  }

  function loadCollection(which) {
    var bag = which === "repos" ? state.repos : state.prompts;
    var indexUrl = which === "repos" ? "data/repos/index.json" : "data/index.json";
    var root = which === "repos" ? "data/repos/" : "data/";
    bag.error = "";
    if (state.view === which) {
      feed.replaceChildren(h("p", { class: "status", text: "正在加载…" }));
      resultEl.textContent = "正在加载…";
    }
    getJson(indexUrl).then(function (index) {
      if (!Array.isArray(index)) throw new Error(indexUrl + " 应该是数组");
      var list = index.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
      return Promise.all(list.map(function (item) {
        var url = resolveFile(item.file, root);
        return getJson(url).then(function (data) {
          var date = (data && data.date) || item.date;
          var entries = data && Array.isArray(data.entries) ? data.entries : [];
          if (data && data.schemaVersion !== 1) console.warn("unexpected schema", url);
          if (Number(item.count) !== entries.length) {
            console.warn("count mismatch", date, item.count, entries.length);
          }
          return entries.map(function (raw) {
            var copy = Object.assign({}, raw, { day: date });
            copy.id = copy.id == null ? "" : String(copy.id);
            return copy;
          });
        });
      }));
    }).then(function (groups) {
      var entries = groups.reduce(function (all, items) { return all.concat(items); }, []);
      bag.entries = which === "repos" ? dedupeRepos(entries) : entries;
      bag.ready = true;
      bag.error = "";
      if (state.view === which) {
        fillJump();
        render();
        syncSticky();
      }
    }).catch(function (err) {
      console.error(err);
      bag.ready = false;
      bag.error = (err && err.message) || "请用本地服务器打开本站，不要直接双击 HTML 文件。";
      if (state.view === which) showError(which, bag.error);
    });
  }

  function viewFromHash() {
    var hash = location.hash;
    if (hash === "#repos") return "repos";
    if (hash === "#prompts" || hash === "" || hash === "#") return "prompts";
    return "";
  }

  function selectView(view, fromHistory) {
    if (view !== "prompts" && view !== "repos") view = "prompts";
    var changed = state.view !== view;
    state.view = view;
    if (!fromHistory) {
      var next = view === "repos" ? "#repos" : "#prompts";
      if (location.hash !== next) history.pushState({ view: view }, "", next);
    }
    if (!changed) return;
    syncChrome();
    if (active().ready) fillJump();
    render();
    syncSticky();
    if (changed) window.scrollTo({ top: 0, behavior: motion() });
  }

  function scrollToResults() {
    if (window.scrollY < 240) return;
    var sticky = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sticky-h"), 10) || 0;
    var top = feed.getBoundingClientRect().top + window.scrollY - sticky - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: motion() });
  }

  document.getElementById("tab-prompts").addEventListener("click", function () {
    selectView("prompts");
  });
  document.getElementById("tab-repos").addEventListener("click", function () {
    selectView("repos");
  });
  window.addEventListener("hashchange", function () {
    var view = viewFromHash();
    if (view) selectView(view, true);
  });
  window.addEventListener("popstate", function () {
    var view = viewFromHash();
    if (view) selectView(view, true);
  });

  document.getElementById("tools").addEventListener("submit", function (event) {
    event.preventDefault();
  });

  qInput.addEventListener("input", function () {
    active().q = qInput.value;
    clearBtn.hidden = !qInput.value;
    render();
  });

  clearBtn.addEventListener("click", function () {
    qInput.value = "";
    active().q = "";
    clearBtn.hidden = true;
    qInput.focus();
    render();
  });

  document.querySelectorAll(".sort button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.hidden) return;
      if (btn.dataset.sort === "stars" && state.view !== "repos") return;
      active().sort = btn.dataset.sort;
      syncSort();
      render();
    });
  });

  chipsEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-category]");
    if (!btn) return;
    active().category = btn.dataset.category;
    render();
    scrollToResults();
  });

  jump.addEventListener("change", function () {
    var date = jump.value;
    jump.value = "";
    if (!date) return;
    var bag = active();
    if (bag.sort !== "time") {
      bag.sort = "time";
      syncSort();
    }
    render();
    var section = document.getElementById("day-" + date);
    if (!section) {
      showToast("这一天没有符合筛选的内容");
      return;
    }
    section.scrollIntoView({ behavior: motion(), block: "start" });
  });

  feed.addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn || !feed.contains(btn)) return;
    if (btn.dataset.retry) {
      loadCollection(btn.dataset.retry);
      return;
    }
    if (btn.id === "reset") {
      var bag = active();
      qInput.value = "";
      bag.q = "";
      bag.category = "全部";
      clearBtn.hidden = true;
      render();
      return;
    }
    if (btn.dataset.pick) {
      var current = active();
      current.category = current.category === btn.dataset.pick ? "全部" : btn.dataset.pick;
      render();
      scrollToResults();
      return;
    }
    if (btn.dataset.expand) {
      var key = btn.dataset.expand;
      var card = btn.closest(".card");
      var openSet = active().open;
      if (openSet.has(key)) openSet.delete(key);
      else openSet.add(key);
      if (card && card.dataset.kind === "repo") {
        var post = card.querySelector(".post-text");
        var open = openSet.has(key);
        if (post) post.hidden = !open;
        btn.textContent = open ? "收起" : "展开原文";
        btn.setAttribute("aria-expanded", String(open));
        card.classList.toggle("is-open", open);
        return;
      }
      syncClamps();
      return;
    }
    if (btn.dataset.copyUrl || btn.dataset.copy) {
      var idle = btn.dataset.idle || "复制提示词";
      var text = btn.dataset.copyUrl || "";
      if (!text) {
        var prompt = btn.closest(".card");
        prompt = prompt ? prompt.querySelector(".prompt") : null;
        text = prompt ? prompt.textContent : "";
      }
      copyText(text).then(function (ok) {
        showToast(ok ? "已复制" : "复制失败，请长按文字手动复制");
        if (!ok) return;
        btn.classList.add("is-done");
        btn.textContent = "已复制";
        window.clearTimeout(btn._copyTimer);
        btn._copyTimer = window.setTimeout(function () {
          btn.classList.remove("is-done");
          btn.textContent = idle;
        }, 1600);
      });
    }
  });

  window.addEventListener("scroll", function () {
    var on = window.scrollY > 480;
    toTop.classList.toggle("is-on", on);
    toTop.setAttribute("aria-hidden", on ? "false" : "true");
  }, { passive: true });

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: motion() });
  });
  toTop.setAttribute("aria-hidden", "true");

  window.addEventListener("resize", function () {
    syncSticky();
    if (state.view === "prompts") syncClamps();
  });

  state.view = viewFromHash() || "prompts";
  syncChrome();
  loadCollection("prompts");
  loadCollection("repos");
})();
