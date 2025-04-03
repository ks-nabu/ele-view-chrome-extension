// popup.js (修正後 全体)

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

// タグごとの設定 (色, zIndex)
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
document.addEventListener("DOMContentLoaded", async () => {
  // Local Storageから選択状態を読み込む
  const result = await chrome.storage.local.get(["selectedTags"]);
  const selected = result.selectedTags || []; // 保存されていなければ空配列
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    if (selected.includes(cb.value)) {
      cb.checked = true;
    }
  });
  updateSelectAllState(); // 「すべて選択」チェックボックスの状態を更新
});

// チェックボックスが変更されたらLocal Storageに保存
tagSelectionContainer.addEventListener("change", (event) => {
  if (event.target.classList.contains("tag-checkbox")) {
    saveSelectedTags();
    updateSelectAllState(); // 「すべて選択」の状態も更新
  }
});

// 「すべて選択」チェックボックスの処理
selectAllCheckbox.addEventListener("change", () => {
  const isChecked = selectAllCheckbox.checked;
  document.querySelectorAll(".tag-checkbox").forEach((cb) => {
    cb.checked = isChecked;
  });
  saveSelectedTags(); // 変更を保存
});

// 選択されているタグをLocal Storageに保存する関数
function saveSelectedTags() {
  const selectedTags = getSelectedTags();
  chrome.storage.local.set({ selectedTags });
}

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
  // すべてのチェックボックスが存在し、かつすべてチェックされている場合に true
  selectAllCheckbox.checked =
    allCheckboxes.length > 0 &&
    allCheckboxes.length === checkedCheckboxes.length;
}

// --- ボタンのイベントリスナー (content.jsへメッセージ送信) ---

// 「表示 (再描画)」ボタン
onButton.addEventListener("click", async () => {
  // ↓↓↓ この行が正しいか確認 ↓↓↓
  const selectedTags = getSelectedTags();

  const configsToSend = {};
  // ↓↓↓ selectedTags が配列であれば、ここでエラーは起きないはず ↓↓↓
  selectedTags.forEach((tag) => {
    if (tagConfigs[tag]) {
      configsToSend[tag] = tagConfigs[tag];
    }
  });

  try {
    // 現在アクティブなタブを取得
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      // content.js にメッセージを送信
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "visualize", // アクション種別
          tags: selectedTags, // 選択されたタグの配列
          configs: configsToSend, // タグごとの色とzIndex
        },
        (response) => {
          // content.jsからの応答を受け取るコールバック (任意)
          if (chrome.runtime.lastError) {
            // メッセージ送信に失敗した場合 (例: content.js がまだ準備できていない)
            console.error(
              "Ele-view: メッセージ送信失敗:",
              chrome.runtime.lastError.message
            );
          } else if (response?.success) {
            // console.log("Ele-view: 表示指示を送信しました。"); // 成功ログ (デバッグ用)
          } else {
            // console.log("Ele-view: content.jsからの応答が想定外です。", response); // 予期せぬ応答 (デバッグ用)
          }
        }
      );
    } else {
      console.error("Ele-view: アクティブなタブのIDを取得できませんでした。");
    }
  } catch (error) {
    // その他の予期せぬエラー
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
      // content.js にクリア指示を送信
      chrome.tabs.sendMessage(
        tab.id,
        { action: "clear" }, // クリアアクション
        (response) => {
          // 応答処理 (任意)
          if (chrome.runtime.lastError) {
            console.error(
              "Ele-view: クリアメッセージ送信失敗:",
              chrome.runtime.lastError.message
            );
          } else if (response?.success) {
            // console.log("Ele-view: クリア指示を送信しました。"); // 成功ログ (デバッグ用)
          }
        }
      );
    } else {
      console.error("Ele-view: アクティブなタブのIDを取得できませんでした。");
    }
  } catch (error) {
    console.error("Ele-view: クリアメッセージ送信中にエラー:", error);
  }
});

// 注意: 以前ここにあった visualizeElements と clearOverlays の関数定義は削除されました。
//       これらの処理は content.js で行われます。
