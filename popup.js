// popup.js (パディング表示設定を追加 - 完全版)

// --- 設定と要素取得 ---
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
// パディング数値表示チェックボックスを取得
const showPaddingCheckbox = document.getElementById("show-padding-values");

// タグごとの設定 (色, zIndex) - 必要に応じて調整
const tagConfigs = {
  div: { color: "rgba(255, 0, 0, 0.7)", zIndex: 100 }, // ボーダーのz-index
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

// --- チェックボックス生成 ---
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

// --- 状態の読み込みと保存、全選択のロジック ---

const STORAGE_KEY = "eleViewSettings"; // Local Storage キー

// DOM読み込み完了時に設定を復元
document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const settings = result[STORAGE_KEY] || {}; // 保存データがなければ空
  const selected = settings.selectedTags || [];
  const showPadding = settings.showPaddingValues === true; // デフォルトfalse

  // タグ選択を復元
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    cb.checked = selected.includes(cb.value);
  });
  updateSelectAllState();

  // パディング数値表示設定を復元
  showPaddingCheckbox.checked = showPadding;
});

// 設定を Local Storage に保存する関数
async function saveSettings() {
  const selectedTags = getSelectedTags();
  const showPaddingValues = showPaddingCheckbox.checked;
  const settings = {
    selectedTags: selectedTags,
    showPaddingValues: showPaddingValues,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  // console.log("Settings saved:", settings); // デバッグ用
}

// タグ選択が変更されたら保存
tagSelectionContainer.addEventListener("change", (event) => {
  if (event.target.classList.contains("tag-checkbox")) {
    saveSettings();
    updateSelectAllState();
  }
});

// 「すべて選択」が変更されたら保存
selectAllCheckbox.addEventListener("change", () => {
  const isChecked = selectAllCheckbox.checked;
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    cb.checked = isChecked;
  });
  saveSettings();
});

// パディング数値表示が変更されたら保存
showPaddingCheckbox.addEventListener("change", saveSettings);

// 現在選択されているタグの配列を取得する関数
function getSelectedTags() {
  return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
    (cb) => cb.value
  );
}

// 「すべて選択」チェックボックスの状態を更新する関数
function updateSelectAllState() {
  const allCheckboxes = document.querySelectorAll(".tag-checkbox");
  const checkedCheckboxes = document.querySelectorAll(".tag-checkbox:checked");
  selectAllCheckbox.checked =
    allCheckboxes.length > 0 &&
    allCheckboxes.length === checkedCheckboxes.length;
}

// --- ボタンのイベントリスナー (content.jsへメッセージ送信) ---

// 「表示 (再描画)」ボタン
onButton.addEventListener("click", async () => {
  const selectedTags = getSelectedTags();
  const configsToSend = {};
  selectedTags.forEach((tag) => {
    if (tagConfigs[tag]) {
      configsToSend[tag] = tagConfigs[tag];
    }
  });
  // パディング数値表示の設定値を取得
  const showPaddingValues = showPaddingCheckbox.checked;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      // content.js にメッセージを送信
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "visualize",
          tags: selectedTags,
          configs: configsToSend,
          showPaddingValues: showPaddingValues, // パディング表示設定を追加
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Ele-view: メッセージ送信失敗:",
              chrome.runtime.lastError.message
            );
          } else if (response?.success) {
            // console.log("Ele-view: 表示指示を送信しました。");
          } else {
            // console.log("Ele-view: content.jsからの応答が想定外です。", response);
          }
        }
      );
    } else {
      console.error("Ele-view: アクティブなタブのIDを取得できませんでした。");
    }
  } catch (error) {
    console.error("Ele-view: 表示メッセージ送信中にエラー:", error);
  }
});

// 「非表示」ボタン
offButton.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "clear" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Ele-view: クリアメッセージ送信失敗:",
            chrome.runtime.lastError.message
          );
        } else if (response?.success) {
          // console.log("Ele-view: クリア指示を送信しました。");
        }
      });
    } else {
      console.error("Ele-view: アクティブなタブのIDを取得できませんでした。");
    }
  } catch (error) {
    console.error("Ele-view: クリアメッセージ送信中にエラー:", error);
  }
});
