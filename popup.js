// popup.js (全体)

const availableTags = [
  "div",
  "p",
  "section",
  "ul",
  "ol",
  "li",
  "header",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
];
const tagSelectionContainer = document.getElementById("tag-selection");
const selectAllCheckbox = document.getElementById("select-all");
const onButton = document.getElementById("on-button");
const offButton = document.getElementById("off-button");

// タグごとの設定
const tagConfigs = {
  div: { color: "rgba(255, 0, 0, 0.7)", zIndex: 100 },
  p: { color: "rgba(0, 0, 255, 0.7)", zIndex: 101 },
  section: { color: "rgba(0, 128, 0, 0.7)", zIndex: 102 },
  ul: { color: "rgba(255, 165, 0, 0.7)", zIndex: 103 },
  ol: { color: "rgba(255, 192, 203, 0.7)", zIndex: 104 },
  li: { color: "rgba(128, 0, 128, 0.7)", zIndex: 105 },
  header: { color: "rgba(0, 255, 255, 0.7)", zIndex: 106 },
  footer: { color: "rgba(165, 42, 42, 0.7)", zIndex: 107 },
  h1: { color: "rgba(255, 255, 0, 0.8)", zIndex: 110 },
  h2: { color: "rgba(218, 165, 32, 0.8)", zIndex: 109 },
  h3: { color: "rgba(173, 216, 230, 0.8)", zIndex: 108 },
  h4: { color: "rgba(144, 238, 144, 0.8)", zIndex: 107 },
};

// --- チェックボックス生成ロジック (変更なし) ---
availableTags.forEach((tag) => {
  const div = document.createElement("div");
  div.className = "flex items-center";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `tag-${tag}`;
  checkbox.value = tag;
  checkbox.className = "tag-checkbox mr-1";
  const label = document.createElement("label");
  label.htmlFor = `tag-${tag}`;
  label.textContent = tag;
  label.className = "text-gray-700";
  const colorSample = document.createElement("span");
  colorSample.style.display = "inline-block";
  colorSample.style.width = "10px";
  colorSample.style.height = "10px";
  colorSample.style.backgroundColor = tagConfigs[tag]?.color || "transparent";
  colorSample.style.marginLeft = "4px";
  colorSample.style.border = "1px solid #ccc";
  div.appendChild(checkbox);
  div.appendChild(label);
  div.appendChild(colorSample);
  tagSelectionContainer.appendChild(div);
});
// --- チェックボックス生成ロジックここまで ---

// --- ストレージ関連、すべて選択関連 (変更なし) ---
document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.local.get(["selectedTags"]);
  const selected = result.selectedTags || [];
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    if (selected.includes(cb.value)) {
      cb.checked = true;
    }
  });
  updateSelectAllState();
});

tagSelectionContainer.addEventListener("change", (event) => {
  if (event.target.classList.contains("tag-checkbox")) {
    saveSelectedTags();
    updateSelectAllState();
  }
});

selectAllCheckbox.addEventListener("change", () => {
  const isChecked = selectAllCheckbox.checked;
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    cb.checked = isChecked;
  });
  saveSelectedTags();
});

function saveSelectedTags() {
  const selectedTags = getSelectedTags();
  chrome.storage.local.set({ selectedTags });
}

function getSelectedTags() {
  return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
    (cb) => cb.value
  );
}

function updateSelectAllState() {
  const allCheckboxes = document.querySelectorAll(".tag-checkbox");
  const checkedCheckboxes = document.querySelectorAll(".tag-checkbox:checked");
  selectAllCheckbox.checked =
    allCheckboxes.length > 0 &&
    allCheckboxes.length === checkedCheckboxes.length; // 空の場合も考慮
}
// --- ストレージ関連、すべて選択関連ここまで ---

// ****** ↓↓↓ オンボタン、オフボタンの処理を修正 ↓↓↓ ******

// オンボタンの処理 (asyncに変更し、処理を分離)
onButton.addEventListener("click", async () => {
  // asyncキーワードを追加
  const tagsToVisualize = getSelectedTags();
  if (tagsToVisualize.length === 0) return; // タグが選択されていない場合は何もしない

  const configsToSend = {};
  tagsToVisualize.forEach((tag) => {
    if (tagConfigs[tag]) {
      configsToSend[tag] = tagConfigs[tag];
    }
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    console.error("アクティブなタブが見つかりません。");
    return;
  }

  try {
    // content.js を注入して関数定義を確実にする (念のため)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // 1. 最初に clearOverlays を実行
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clearOverlays, // clearOverlays関数をページ側で実行
    });

    // 2. 次に visualizeElements を実行
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: visualizeElements, // visualizeElements関数をページ側で実行
      args: [tagsToVisualize, configsToSend], // 引数を渡す
    });
  } catch (err) {
    console.error("スクリプトの実行中にエラーが発生しました:", err);
    // エラー発生時もポートが閉じる場合があるので、エラー内容を確認
    if (
      err.message.includes("Could not establish connection") ||
      err.message.includes("Receiving end does not exist")
    ) {
      console.warn(
        "ページがリロードされたか、拡張機能が無効になった可能性があります。"
      );
    } else if (
      !err.message.includes(
        "The message port closed before a response was received"
      )
    ) {
      // "port closed"以外のエラーを表示
      console.error("詳細エラー:", err);
    }
  }
});

// オフボタンの処理 (asyncに変更)
offButton.addEventListener("click", async () => {
  // asyncキーワードを追加
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    console.error("アクティブなタブが見つかりません。");
    return;
  }
  try {
    // content.js を注入 (念のため)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    // clearOverlays を実行
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clearOverlays, // clearOverlays関数をページ側で実行
    });
  } catch (err) {
    console.error("オーバーレイのクリア中にエラーが発生しました:", err);
    if (
      err.message.includes("Could not establish connection") ||
      err.message.includes("Receiving end does not exist")
    ) {
      console.warn(
        "ページがリロードされたか、拡張機能が無効になった可能性があります。"
      );
    } else if (
      !err.message.includes(
        "The message port closed before a response was received"
      )
    ) {
      console.error("詳細エラー:", err);
    }
  }
});

// popup.js 内の関数定義部分 (最終版 - Fixedコンテナ + ビューポート座標)

/* istanbul ignore next */
function visualizeElements(tags, configs) {
  // --- fixedコンテナのみを使用 ---
  let fixedContainer = document.getElementById(
    "ele-view-overlay-container-fixed"
  );
  if (!fixedContainer) {
    fixedContainer = document.createElement("div");
    fixedContainer.id = "ele-view-overlay-container-fixed";
    fixedContainer.style.position = "fixed"; // ビューポート基準のコンテナ
    fixedContainer.style.top = "0";
    fixedContainer.style.left = "0";
    // コンテナ自体はサイズ不要。オーバーレイが絶対配置される基点となる。
    fixedContainer.style.width = "0";
    fixedContainer.style.height = "0";
    fixedContainer.style.zIndex = "99999"; // 最前面に
    fixedContainer.style.pointerEvents = "none"; // クリック透過
    if (document.body) {
      document.body.appendChild(fixedContainer);
    } else {
      console.error("Ele-view: document.body が見つかりません。");
      return;
    }
  }
  // --- コンテナ準備完了 ---

  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag);
    const config = configs[tag] || { color: "gray", zIndex: 99 };

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      // 画面外チェック
      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;
      // 幅高さ0 または 完全に画面外の要素はスキップ
      if (rect.width === 0 || rect.height === 0 || !isInViewport) {
        return;
      }

      const overlay = document.createElement("div");
      overlay.classList.add("ele-view-overlay");
      overlay.style.position = "absolute"; // fixedコンテナ内で絶対配置

      // ★ 座標計算：ビューポート座標をそのまま使用 ★
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      // ★★★★★★★★★★★★★★★★★★★★★★★★

      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = `2px solid ${config.color}`; // ボーダーは2px
      overlay.style.zIndex = config.zIndex;
      overlay.style.pointerEvents = "none";
      overlay.style.boxSizing = "border-box";

      // すべてのオーバーレイをfixedコンテナに追加
      fixedContainer.appendChild(overlay);
    });
  });
}

/* istanbul ignore next */
function clearOverlays() {
  // fixedコンテナのみを削除
  const fixedContainer = document.getElementById(
    "ele-view-overlay-container-fixed"
  );
  if (fixedContainer) {
    fixedContainer.remove();
  }
  // absoluteコンテナが残っている可能性も考慮して削除
  const absoluteContainer = document.getElementById(
    "ele-view-overlay-container-absolute"
  );
  if (absoluteContainer) {
    absoluteContainer.remove();
  }
}
