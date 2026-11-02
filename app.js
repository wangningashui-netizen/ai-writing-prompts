/* 如水成文
   提示词全部来自 data/index.json 与 data/YYYY-MM-DD.json。
   更新内容时不要改这个文件。
*/
(function () {
  var PREFERRED = ["润色", "文案", "小红书", "剧本", "演讲", "邮件", "内容矩阵", "其他"];
  var LANG = { zh: "中文", en: "英文", ja: "日文", ko: "韩文" };

  var state = {
    entries: [],
    q: "",
    category: "全部",
    sort: "time",
    open: new Set(),
    loading: false
  };

  var feed = document.getElementById("feed");
  var chipsEl = document.getElementById("chips");
  var resultEl = document.getElementById("result");
  var qInput = document.getElementById("q");
  var clearBtn = document.getElementById("clear");
  var jump = document.getElementById("jump");
  var toastEl = document.getElementById("toast");
  var toTop = document.getElementById("to-top");
  var toastTimer = 0;

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

  function resolveFile(file) {
    var name = String(file || "").replace(/^\//, "");
    if (!name || name.indexOf("..") !== -1) throw new Error("非法数据路径");
    if (name.indexOf("data/") === 0) return name;
    return "data/" + name;
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

  function langLabel(code) {
    var key = String(code || "").toLowerCase();
    return LANG[key] || (key ? key.toUpperCase() : "");
  }

  function safeUrl(url) {
    try {
      var u = new URL(url);
      if (u.protocol === "https:" || u.protocol === "http:") return u.href;
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
    var p = shanghaiParts(iso);
    return Number(p.month) + "月" + Number(p.day) + "日 " + p.hour + ":" + p.minute;
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

  function categoriesOf(entries) {
    var extra = [];
    entries.forEach(function (entry) {
      var cat = entry.category;
      if (cat && PREFERRED.indexOf(cat) === -1 && extra.indexOf(cat) === -1) extra.push(cat);
    });
    extra.sort(function (a, b) { return a.localeCompare(b, "zh"); });
    return ["全部"].concat(PREFERRED, extra);
  }

  function hit(entry, q) {
    if (!q) return true;
    var hay = [entry.title, entry.summary, entry.prompt].join("\n").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function ordered(list) {
    var out = list.slice();
    out.sort(function (a, b) {
      if (state.sort === "heat") {
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

  function syncSticky() {
    var bar = document.querySelector(".toolbar");
    if (!bar) return;
    document.documentElement.style.setProperty("--sticky-h", bar.offsetHeight + "px");
  }

  function syncSort() {
    document.querySelectorAll(".sort button").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.dataset.sort === state.sort));
    });
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
    var seen = [];
    state.entries.forEach(function (entry) {
      if (entry.day && seen.indexOf(entry.day) === -1) seen.push(entry.day);
    });
    seen.sort(function (a, b) { return a < b ? 1 : -1; });
    var placeholder = h("option", { value: "", text: "选择日期" });
    jump.replaceChildren(placeholder);
    var newestYear = seen.length ? seen[0].slice(0, 4) : "";
    seen.forEach(function (day) {
      var count = state.entries.filter(function (entry) { return entry.day === day; }).length;
      var bits = day.split("-").map(Number);
      var label = (day.slice(0, 4) === newestYear ? "" : bits[0] + "年") + bits[1] + "月" + bits[2] + "日 · " + count + "条";
      jump.append(h("option", { value: day, text: label }));
    });
    jump.value = "";
  }

  function renderChips(searched) {
    var counts = new Map();
    searched.forEach(function (entry) {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    });
    var cats = categoriesOf(state.entries);
    if (cats.indexOf(state.category) === -1) state.category = "全部";
    var left = chipsEl.scrollLeft;
    chipsEl.replaceChildren();
    cats.forEach(function (cat) {
      var n = cat === "全部" ? searched.length : (counts.get(cat) || 0);
      var btn = h("button", {
        type: "button",
        class: "chip",
        "data-category": cat,
        "aria-pressed": String(state.category === cat)
      }, cat);
      btn.append(h("span", { class: "chip-count", text: String(n) }));
      chipsEl.append(btn);
    });
    chipsEl.scrollLeft = left;
  }

  function renderResult(count) {
    var bits = [];
    bits.push(state.sort === "heat" ? "按热度" : "最新在前");
    if (state.category !== "全部") bits.push(state.category);
    var q = state.q.trim();
    if (q) bits.push("“" + q + "”");
    bits.push(count + " 条");
    resultEl.textContent = bits.join(" · ");
  }

  function cardView(entry) {
    var open = state.open.has(entry.id);
    var card = h("article", { class: "card" + (open ? " is-open" : ""), "data-id": entry.id });

    var catBtn = h("button", {
      type: "button",
      class: "cat",
      "data-pick": entry.category || "",
      "aria-pressed": String(state.category === entry.category)
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
    var copyBtn = h("button", {
      type: "button",
      class: "btn btn-primary",
      "data-copy": entry.id
    }, "复制提示词");
    card.append(h("div", { class: "actions" }, copyBtn, source));

    var likes = Number(entry.likes) || 0;
    var bookmarks = Number(entry.bookmarks) || 0;
    var likeEl = h("span", { class: "stat" }, icon("heart"), String(likes), h("span", { class: "sr", text: "次点赞" }));
    var saveEl = h("span", { class: "stat" }, icon("bookmark"), String(bookmarks), h("span", { class: "sr", text: "次收藏" }));
    var when = formatTime(entry.createdAt);
    var who = entry.authorName || (entry.author ? "@" + entry.author : "");
    var whoHref = authorHref(entry);
    var whoEl = who
      ? (whoHref
        ? h("a", { class: "author", href: whoHref, target: "_blank", rel: "noopener noreferrer" }, who)
        : h("span", { class: "author", text: who }))
      : null;
    card.append(h("div", { class: "meta" },
      likeEl,
      saveEl,
      when ? h("time", { class: "when", datetime: entry.createdAt || "", text: when }) : null,
      whoEl
    ));
    return card;
  }

  function syncClamps() {
    feed.querySelectorAll(".prompt").forEach(function (el) {
      var id = el.dataset.id;
      var btn = el.parentElement.querySelector("[data-expand]");
      var card = el.closest(".card");
      if (!btn || !card) return;
      var open = state.open.has(id);
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

  function render() {
    var q = state.q.trim().toLowerCase();
    var searched = state.entries.filter(function (entry) { return hit(entry, q); });
    renderChips(searched);
    var shown = ordered(state.category === "全部"
      ? searched
      : searched.filter(function (entry) { return entry.category === state.category; }));
    renderResult(shown.length);
    feed.replaceChildren();

    if (!state.entries.length) {
      feed.append(h("p", { class: "status", text: "还没有提示词。" }));
      return;
    }
    if (!shown.length) {
      feed.append(h("div", { class: "empty" },
        h("p", { text: "没有匹配的提示词" }),
        h("button", { type: "button", class: "btn", id: "reset" }, "清除筛选")
      ));
      return;
    }

    if (state.sort === "heat") {
      feed.append(h("div", { class: "cards" }, shown.map(cardView)));
    } else {
      groupByDay(shown).forEach(function (group) {
        var heading = dayHeading(group.day);
        feed.append(h("section", { class: "day", id: "day-" + group.day },
          h("h2", { class: "day-head" },
            h("span", { class: "day-label", text: heading }),
            h("span", { class: "day-count", text: group.entries.length + " 条" })
          ),
          h("div", { class: "cards" }, group.entries.map(cardView))
        ));
      });
    }
    syncClamps();
  }

  function showFatal(message) {
    feed.replaceChildren(h("div", { class: "empty" },
      h("p", { text: "提示词没有载入。" }),
      h("p", { class: "fine", text: message }),
      h("button", { type: "button", class: "btn", id: "retry" }, "重试")
    ));
    resultEl.textContent = "";
  }

  function scrollToResults() {
    if (window.scrollY < 240) return;
    var sticky = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sticky-h"), 10) || 0;
    var top = feed.getBoundingClientRect().top + window.scrollY - sticky - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: motion() });
  }

  function load() {
    if (state.loading) return;
    state.loading = true;
    feed.replaceChildren(h("p", { class: "status", text: "正在加载…" }));
    resultEl.textContent = "正在加载…";
    getJson("data/index.json").then(function (index) {
      if (!Array.isArray(index)) throw new Error("data/index.json 应该是数组");
      var list = index.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
      return Promise.all(list.map(function (item) {
        var url = resolveFile(item.file);
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
      state.entries = groups.reduce(function (all, items) { return all.concat(items); }, []);
      fillJump();
      render();
      syncSticky();
    }).catch(function (err) {
      console.error(err);
      var message = (err && err.message) || "请用本地服务器打开本站，不要直接双击 HTML 文件。";
      showFatal(message);
    }).then(function () {
      state.loading = false;
    });
  }

  document.getElementById("tools").addEventListener("submit", function (event) {
    event.preventDefault();
  });

  qInput.addEventListener("input", function () {
    state.q = qInput.value;
    clearBtn.hidden = !state.q;
    render();
  });

  clearBtn.addEventListener("click", function () {
    qInput.value = "";
    state.q = "";
    clearBtn.hidden = true;
    qInput.focus();
    render();
  });

  document.querySelectorAll(".sort button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.sort = btn.dataset.sort;
      syncSort();
      render();
    });
  });

  chipsEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-category]");
    if (!btn) return;
    state.category = btn.dataset.category;
    render();
    scrollToResults();
  });

  jump.addEventListener("change", function () {
    var date = jump.value;
    jump.value = "";
    if (!date) return;
    if (state.sort !== "time") {
      state.sort = "time";
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
    if (btn.id === "retry") {
      feed.replaceChildren(h("p", { class: "status", text: "正在加载…" }));
      load();
      return;
    }
    if (btn.id === "reset") {
      qInput.value = "";
      state.q = "";
      state.category = "全部";
      clearBtn.hidden = true;
      render();
      return;
    }
    if (btn.dataset.pick) {
      state.category = state.category === btn.dataset.pick ? "全部" : btn.dataset.pick;
      render();
      scrollToResults();
      return;
    }
    if (btn.dataset.expand) {
      var id = btn.dataset.expand;
      if (state.open.has(id)) state.open.delete(id);
      else state.open.add(id);
      syncClamps();
      return;
    }
    if (btn.dataset.copy) {
      var card = btn.closest(".card");
      var prompt = card ? card.querySelector(".prompt") : null;
      var text = prompt ? prompt.textContent : "";
      copyText(text).then(function (ok) {
        showToast(ok ? "已复制" : "复制失败，请长按提示词手动复制");
        if (!ok) return;
        btn.classList.add("is-done");
        btn.textContent = "已复制";
        window.clearTimeout(btn._copyTimer);
        btn._copyTimer = window.setTimeout(function () {
          btn.classList.remove("is-done");
          btn.textContent = "复制提示词";
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
    syncClamps();
  });

  load();
})();
