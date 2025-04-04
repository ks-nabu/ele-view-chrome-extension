// popup.js (最終版 - クリーンアップ＆コメント追加)

/**
 * @file ポップアップウィンドウのUI操作とコンテンツスクリプトへの指示を担当します。
 */

// --- 定数定義 ---

/** @const {string[]} 利用可能なHTMLタグのリスト */
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
  "table",
  "th",
  "td",
];

/** @const {string} Local Storage に設定を保存するためのキー */
const STORAGE_KEY = "eleViewSettings";

/**
 * @typedef {Object} TagConfig - 各タグの表示設定
 * @property {string} color - ボーダーの色 (RGBA形式推奨)
 * @property {number} zIndex - ボーダーのz-index (パディングBOXはこれ-1, ラベルはこれ+1)
 */

/** @const {Object<string, TagConfig>} タグごとの表示設定 */
const tagConfigs = {
  // 色やz-indexはお好みで調整してください
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
  table: { color: "rgba(147, 112, 219, 0.7)", zIndex: 111 },
  th: { color: "rgba(0, 128, 128, 0.7)", zIndex: 112 },
  td: { color: "rgba(119, 136, 153, 0.7)", zIndex: 113 },
};

// --- DOM要素取得 ---
const tagSelectionContainer = document.getElementById("tag-selection");
const selectAllCheckbox = document.getElementById("select-all");
const onButton = document.getElementById("on-button");
const offButton = document.getElementById("off-button");
const showPaddingCheckbox = document.getElementById("show-padding-values");

// --- UI ローカライズ処理 ---

/**
 * ポップアップ内のテキスト要素を、ブラウザの言語設定に応じてローカライズします。
 * messages.json 内のキーに対応する文字列を使用します。
 */
function localizeUI() {
  const getMsg = chrome.i18n.getMessage;
  // getMessageがキーを見つけられない場合に備え、デフォルトテキストを提供するヘルパー
  const getMsgSafe = (key, defaultText) => {
    try {
      const message = getMsg(key);
      // message が空文字列の場合もあるのでフォールバック
      return message || defaultText;
    } catch (e) {
      // 開発中はエラーを確認し、本番ではデフォルトテキストにフォールバック
      console.warn(`[Ele-view] i18n key "${key}" not found.`, e);
      return defaultText;
    }
  };

  // 各要素のテキストを設定
  const titleElement = document.getElementById("popupTitle");
  if (titleElement)
    titleElement.textContent = getMsgSafe("popupTitle", "Ele-view");

  const tagsHeading = document.getElementById("selectTagsHeading");
  if (tagsHeading)
    tagsHeading.textContent = getMsgSafe(
      "selectTagsHeading",
      "Select tags to display:"
    );

  const settingsHeading = document.getElementById("settingsHeading");
  if (settingsHeading)
    settingsHeading.textContent = getMsgSafe(
      "settingsHeading",
      "Display Settings:"
    );

  const selectAllLabel = document.getElementById("selectAllLabel");
  if (selectAllLabel)
    selectAllLabel.textContent = getMsgSafe("selectAllLabel", "Select All");

  const showPaddingLabel = document.getElementById("showPaddingLabel");
  if (showPaddingLabel)
    showPaddingLabel.textContent = getMsgSafe(
      "showPaddingLabel",
      "Show padding values"
    );

  if (onButton)
    onButton.textContent = getMsgSafe("onButtonText", "Show (Redraw)");
  if (offButton) offButton.textContent = getMsgSafe("offButtonText", "Hide");

  // HTMLの<title>タグも更新
  document.title = getMsgSafe("popupTitle", "Ele-view") + " Popup";
}

// --- UI初期化処理 ---

/**
 * 利用可能なタグに基づいて、タグ選択用のチェックボックスを動的に生成します。
 */
function populateTagCheckboxes() {
  availableTags.forEach((tag) => {
    const div = document.createElement("div");
    div.className = "flex items-center"; // Tailwindクラスで縦中央揃え

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `tag-${tag}`;
    checkbox.value = tag;
    // チェックボックスのスタイル（チェック時の色など）
    checkbox.className =
      "tag-checkbox mr-1 accent-blue-600 dark:accent-blue-500";

    const label = document.createElement("label");
    label.htmlFor = `tag-${tag}`;
    label.textContent = tag; // タグ名はそのまま表示
    // ラベルのスタイル（ダークモード対応）
    label.className = "text-gray-700 dark:text-gray-300";

    // 色見本用のspan要素
    const colorSample = document.createElement("span");
    colorSample.style.display = "inline-block";
    colorSample.style.width = "10px";
    colorSample.style.height = "10px";
    colorSample.style.backgroundColor = tagConfigs[tag]?.color || "transparent"; // 設定があれば色を反映
    colorSample.style.marginLeft = "4px";
    colorSample.style.border = "1px solid #ccc"; // 枠線

    // 生成した要素をDOMに追加
    div.appendChild(checkbox);
    div.appendChild(label);
    div.appendChild(colorSample);
    if (tagSelectionContainer) {
      // コンテナが存在するか確認
      tagSelectionContainer.appendChild(div);
    } else {
      console.error("tagSelectionContainer not found.");
    }
  });
}

// --- 設定の読み込みと保存 ---

/**
 * Local Storage から保存された設定（選択されたタグ、パディング表示有無）を読み込み、UIに反映します。
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const settings = result[STORAGE_KEY] || {}; // 保存データがなければ空オブジェクト
    const selected = settings.selectedTags || [];
    const showPadding = settings.showPaddingValues === true; // booleanとして評価

    // タグ選択状態を復元
    document.querySelectorAll(".tag-checkbox").forEach((cb) => {
      cb.checked = selected.includes(cb.value);
    });
    updateSelectAllState(); // 「すべて選択」の状態を更新

    // パディング表示設定を復元
    if (showPaddingCheckbox) {
      // 要素が存在するか確認
      showPaddingCheckbox.checked = showPadding;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

/**
 * 現在のUIの状態（選択されたタグ、パディング表示有無）を Local Storage に保存します。
 */
async function saveSettings() {
  try {
    const selectedTags = getSelectedTags();
    const showPaddingValues = showPaddingCheckbox
      ? showPaddingCheckbox.checked
      : false; // 存在確認
    const settings = {
      selectedTags: selectedTags,
      showPaddingValues: showPaddingValues,
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

/**
 * 現在チェックされているタグの value (タグ名) の配列を取得します。
 * @returns {string[]} 選択されているタグ名の配列
 */
function getSelectedTags() {
  return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
    (cb) => cb.value
  );
}

/**
 * タグ選択チェックボックスの状態に基づいて、「すべて選択」チェックボックスのチェック状態を更新します。
 */
function updateSelectAllState() {
  const allTagCheckboxes = document.querySelectorAll(".tag-checkbox");
  const checkedTagCheckboxes = document.querySelectorAll(
    ".tag-checkbox:checked"
  );
  if (selectAllCheckbox) {
    // 要素が存在するか確認
    selectAllCheckbox.checked =
      allTagCheckboxes.length > 0 && // タグが1つ以上あるか
      allTagCheckboxes.length === checkedTagCheckboxes.length; // すべてチェックされているか
  }
}

// --- イベントリスナー設定 ---

// ポップアップのDOMが読み込まれたら初期化処理を実行
document.addEventListener("DOMContentLoaded", () => {
  localizeUI(); // まずUIテキストをローカライズ
  populateTagCheckboxes(); // 次にタグ選択肢を生成
  loadSettings(); // 最後に保存された設定を読み込みUIに反映
});

// タグ選択コンテナ内のチェックボックスが変更されたら設定を保存
if (tagSelectionContainer) {
  tagSelectionContainer.addEventListener("change", (event) => {
    if (event.target.classList.contains("tag-checkbox")) {
      saveSettings();
      updateSelectAllState();
    }
  });
}

// 「すべて選択」チェックボックスが変更されたときの処理
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
    const isChecked = selectAllCheckbox.checked;
    document.querySelectorAll(".tag-checkbox").forEach((cb) => {
      cb.checked = isChecked;
    });
    saveSettings(); // 変更を保存
  });
}

// パディング表示チェックボックスが変更されたら設定を保存
if (showPaddingCheckbox) {
  showPaddingCheckbox.addEventListener("change", saveSettings);
}

// 「表示 (再描画)」ボタンクリック時の処理
if (onButton) {
  onButton.addEventListener("click", async () => {
    const selectedTags = getSelectedTags();
    const configsToSend = {};
    selectedTags.forEach((tag) => {
      if (tagConfigs[tag]) {
        configsToSend[tag] = tagConfigs[tag];
      }
    });
    const showPaddingValues = showPaddingCheckbox
      ? showPaddingCheckbox.checked
      : false;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        // content.js に visualize メッセージを送信
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "visualize",
            tags: selectedTags,
            configs: configsToSend,
            showPaddingValues: showPaddingValues,
          },
          (response) => {
            // 応答コールバック
            if (chrome.runtime.lastError) {
              // 接続エラーなどが発生した場合
              console.error(
                "Ele-view: メッセージ送信失敗:",
                chrome.runtime.lastError.message
              );
              // 必要ならユーザーに通知する (例: alert)
            } else if (response?.success) {
              // 成功した場合 (content.js が応答した場合)
              // console.log("Ele-view: 表示指示を送信しました。");
            }
          }
        );
      } else {
        console.error("Ele-view: アクティブなタブが見つかりません。");
      }
    } catch (error) {
      console.error("Ele-view: 表示メッセージ送信中にエラー:", error);
    }
  });
}

// 「非表示」ボタンクリック時の処理
if (offButton) {
  offButton.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        // content.js に clear メッセージを送信
        chrome.tabs.sendMessage(tab.id, { action: "clear" }, (response) => {
          // 応答コールバック
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
        console.error("Ele-view: アクティブなタブが見つかりません。");
      }
    } catch (error) {
      console.error("Ele-view: クリアメッセージ送信中にエラー:", error);
    }
  });
}
