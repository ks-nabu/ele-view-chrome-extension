// popup.js

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

// タグごとの設定（不足要件の仮定義）
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

// チェックボックスを生成
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

  // ボーダー色のサンプル表示（任意）
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

// チェック状態をストレージから読み込む
document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.local.get(["selectedTags"]);
  const selected = result.selectedTags || []; // デフォルトは空配列
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    if (selected.includes(cb.value)) {
      cb.checked = true;
    }
  });
  updateSelectAllState(); // 「すべて選択」の状態更新
});

// チェックボックス変更時にストレージに保存
tagSelectionContainer.addEventListener("change", (event) => {
  if (event.target.classList.contains("tag-checkbox")) {
    saveSelectedTags();
    updateSelectAllState();
  }
});

// 「すべて選択」チェックボックスの処理
selectAllCheckbox.addEventListener("change", () => {
  const isChecked = selectAllCheckbox.checked;
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    cb.checked = isChecked;
  });
  saveSelectedTags();
});

// 選択状態をストレージに保存する関数
function saveSelectedTags() {
  const selectedTags = getSelectedTags();
  chrome.storage.local.set({ selectedTags });
}

// 選択されているタグを取得する関数
function getSelectedTags() {
  return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
    (cb) => cb.value
  );
}

// 「すべて選択」の状態を更新する関数
function updateSelectAllState() {
  const allCheckboxes = document.querySelectorAll(".tag-checkbox");
  const checkedCheckboxes = document.querySelectorAll(".tag-checkbox:checked");
  selectAllCheckbox.checked = allCheckboxes.length === checkedCheckboxes.length;
}

// コンテンツスクリプトを実行するヘルパー関数
async function executeContentScript(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    console.error("アクティブなタブが見つかりません。");
    return;
  }
  // content.js を注入（複数回呼んでも問題ないが、初回のみ必要）
  await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    })
    .catch((err) => console.error("content.js の注入に失敗:", err)); // エラーハンドリング追加

  // content.js内の関数を実行
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: func,
      args: args,
    })
    .catch((err) => console.error("関数実行に失敗:", func.name, err)); // エラーハンドリング追加
}

// オンボタンの処理
onButton.addEventListener("click", () => {
  const tagsToVisualize = getSelectedTags();
  const configsToSend = {};
  tagsToVisualize.forEach((tag) => {
    if (tagConfigs[tag]) {
      configsToSend[tag] = tagConfigs[tag];
    }
  });
  // visualizeElements 関数を content script で実行
  executeContentScript(visualizeElements, [tagsToVisualize, configsToSend]);
});

// オフボタンの処理
offButton.addEventListener("click", () => {
  // clearOverlays 関数を content script で実行
  executeContentScript(clearOverlays);
});

// --- content.js内で実行される関数 ---
// これらの関数は popup.js のスコープには存在しないが、
// executeContentScript によってタブのコンテキストで実行される。
// ここに書いておくと、func: visualizeElements のように参照できる。

/* istanbul ignore next */ // Code coverage ignore start
function visualizeElements(tags, configs) {
  // 既存のオーバーレイをクリア
  clearOverlays();

  // オーバーレイ要素を保持するコンテナを作成（または取得）
  let overlayContainer = document.getElementById("ele-view-overlay-container");
  if (!overlayContainer) {
    overlayContainer = document.createElement("div");
    overlayContainer.id = "ele-view-overlay-container";
    // コンテナ自体は操作を受け付けないようにする
    overlayContainer.style.position = "absolute";
    overlayContainer.style.top = "0";
    overlayContainer.style.left = "0";
    overlayContainer.style.width = "0"; // サイズを持たないように
    overlayContainer.style.height = "0";
    overlayContainer.style.zIndex = "99999"; // 他のオーバーレイより手前に来るように念のため設定
    overlayContainer.style.pointerEvents = "none"; // コンテナ自体もイベントを無視
    document.body.appendChild(overlayContainer);
  }

  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag);
    const config = configs[tag] || { color: "gray", zIndex: 99 }; // 設定がない場合のデフォルト

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      // 要素がビューポート内にない場合や非表示の場合はスキップすることも検討
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const overlay = document.createElement("div");
      overlay.classList.add("ele-view-overlay"); // 削除用クラス
      overlay.style.position = "absolute";
      // getBoundingClientRect はビューポート基準、スクロール量を加味して絶対座標に
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = `1px solid ${config.color}`;
      overlay.style.zIndex = config.zIndex;
      overlay.style.pointerEvents = "none"; // オーバーレイ自体がクリック等を妨げないように
      overlay.style.boxSizing = "border-box"; // ボーダーを含めてサイズ計算

      overlayContainer.appendChild(overlay); // コンテナに追加
    });
  });
}

/* istanbul ignore next */
function clearOverlays() {
  const overlayContainer = document.getElementById(
    "ele-view-overlay-container"
  );
  if (overlayContainer) {
    overlayContainer.remove(); // コンテナごと削除する方がシンプル
  }
  // 個別に削除する場合
  // const overlays = document.querySelectorAll('.ele-view-overlay');
  // overlays.forEach(overlay => overlay.remove());
}
// Code coverage ignore end
