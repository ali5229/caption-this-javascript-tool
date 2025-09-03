
(function () {
  const SCRIPT_URL =
    "g-scripte url";

  function jsonp(params, callback) {
    const cbName = "cb_" + Math.random().toString(36).substring(2);
    params.callback = cbName;

          const query = Object.keys(params)
            .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
            .join("&");

          const script = document.createElement("script");
          script.src = SCRIPT_URL + "?" + query;

          window[cbName] = function (data) {
            callback(data);
            document.body.removeChild(script);
            delete window[cbName];
          };
          document.body.appendChild(script);
  }

  function showToast(container, msg, isError = false) {
    const toast = document.createElement("div");
      toast.className = "cw-toast" + (isError ? " cw-error" : "");
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => {
        toast.remove();
    }, 2000);
  }

  function renderCaptions(container, items) {
    const list = container.querySelector(".cw-caption-list");
    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = "<p>No captions yet.</p>";
      return;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "cw-caption-item";

      const votedKey = `cw-voted-${item.id}`;
      const alreadyVoted = localStorage.getItem(votedKey);

      div.innerHTML = `
        <p class="cw-text">${item.text}</p>
        <div class="cw-meta">
          <small>by ${item.by || "anon"}</small>
          <button class="cw-vote" data-id="${item.id}" ${
        alreadyVoted ? "disabled" : ""
      }>▲ ${item.votes}</button>
        </div>
      `;

      div.querySelector(".cw-vote").addEventListener("click", () => {
        voteCaption(container, container.dataset.id, item.id, votedKey);
      });

      list.appendChild(div);
    });
  }

  function loadCaptions(container, widgetId) {
    jsonp({ action: "list", widget: widgetId }, function (res) {
      if (!res.items) return;

      const items = res.items;
      const tab = container.querySelector(".cw-tab.cw-active").dataset.tab;

      let displayItems = [];
      if(tab==="new") {
        displayItems = [...items].sort((a, b) => b.tsNum - a.tsNum).slice(0, 10);
      }
      if (tab === "top") {
        displayItems = [...items].sort((a, b) => b.votes - a.votes).slice(0, 5);
      }  

      renderCaptions(container, displayItems);
    });
  }

  function submitCaption(container, widgetId, text) {
    const by = "guest";
    const btn = container.querySelector(".cw-submit");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    jsonp(
      { action: "submit", widget: widgetId, text: text, by: by },
      function (res) {
        btn.disabled = false;
        btn.textContent = "Submit";

        if (res.error) {
          if (res.error.includes("Duplicate")) {
            showToast(container, "Duplicate", true);
          } else {
            showToast(container, "Network error", true);
          }
        } else {
          showToast(container, "Submitted!");
          loadCaptions(container, widgetId);
        }
      }
    );
  }

  function voteCaption(container, widgetId, id, votedKey) {
    const voter = "guest";
    jsonp(
      { action: "vote", widget: widgetId, id: id, voter: voter },
      function (res) {
        if (res.error) {
          if (res.error.includes("Already")) {
            showToast(container, "Already voted", true);
          } else {
            showToast(container, "Network error", true);
          }
        } else {
          localStorage.setItem(votedKey, "1");
          loadCaptions(container, widgetId);
        }
      }
    );
  }

  function setupWidget(container) {
    const widgetId = container.dataset.id;
    const title = container.dataset.title || "Caption This";
    const photo = container.dataset.photo;

    container.innerHTML = `
      <div class="cw-root">
        <h2 class="cw-title">${title}</h2>
        <img src="${photo}" alt="${title}" class="cw-photo"/>

        <form class="cw-form">
          <input type="text" maxlength="140" placeholder="Write a caption..." required class="cw-input"/>
          <span class="cw-counter">140</span>
          <button type="submit" class="cw-submit">Submit</button>
        </form>

        <div class="cw-tabs">
          <button class="cw-tab cw-active" data-tab="top">Top</button>
          <button class="cw-tab" data-tab="new">New</button>
        </div>
        <div class="cw-caption-list"></div>
      </div>
    `;

    const input = container.querySelector(".cw-input");
    const counter = container.querySelector(".cw-counter");
    input.addEventListener("input", () => {
      const left = 140 - input.value.length;
      counter.textContent = left;
    });

    const form = container.querySelector(".cw-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      submitCaption(container, widgetId, text);
      form.reset();
      counter.textContent = "140";
    });

    const tabs = container.querySelectorAll(".cw-tab");
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("cw-active"));
        tab.classList.add("cw-active");
        loadCaptions(container, widgetId);
      })
    );

    loadCaptions(container, widgetId);
  }
  function init() {
    document.querySelectorAll(".caption-widget").forEach(setupWidget);
    const style = document.createElement("style");
    style.textContent = `
      .cw-root { font-family: system-ui, sans-serif; max-width: 100%; border:1px solid #ccc; padding:12px; border-radius:8px; position:relative; backgroud:#DDF8E8; }
      .cw-title { margin: 0 0 8px; font-size: 1.2em; }
      .cw-photo { width: 50%; height: 300px; border-radius: 6px; margin-bottom: 10px; }
      .cw-form { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .cw-input { flex:1; padding:6px; border:1px solid #ccc; border-radius:4px; }
      .cw-counter { align-self:center; font-size:0.8em; color:#666; }
      .cw-submit { padding:6px 12px; border:none; border-radius:4px; background:#0077ff; color:white; cursor:pointer; }
      .cw-submit:hover { background:#005ec4; }
      .cw-tabs { display:flex; gap:6px; margin-bottom:8px; }
      .cw-tab { flex:1; height:50px; padding:6px; border:none; border-radius:4px; background:#eee; cursor:pointer; }
      .cw-tab.cw-active { background:#FFA3AF; color:white; }
      .cw-caption-item { border-top:1px solid #ddd; padding:6px 0; }
      .cw-text { margin:0; }
      .cw-meta { display:flex; justify-content:space-between; align-items:center; }
      .cw-vote { border:none; background:#eee; padding:2px 6px; border-radius:4px; cursor:pointer; }
      .cw-vote:disabled { opacity:0.5; cursor:default; }
      .cw-toast { position:absolute; bottom:8px; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:6px 12px; border-radius:4px; font-size:0.9em; opacity:0.9; }
      .cw-error { background:#c0392b; }
      @media (max-width: 400px) {
        .cw-form { flex-direction:column; }
        .cw-counter { align-self:flex-end; }
        .cw-submit { width:100%; }
      }
    `;
    document.head.appendChild(style);
  }

  init();
})();
