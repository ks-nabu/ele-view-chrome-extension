// content.js (ログ出力強化版)

// --- 設定と状態管理 ---
const DEBOUNCE_DELAY = 150;
let redrawTimeout = null;
let activeTags = [];
let activeConfigs = {};
let isActive = false;
const CONTAINER_ID = "ele-view-overlay-container-fixed";

// --- オーバーレイのクリア処理 ---
function clearOverlays() {
  console.log("[Ele-view Log] clearOverlays called."); // ★ログ追加
  const fixedContainer = document.getElementById(CONTAINER_ID);
  if (fixedContainer) {
    fixedContainer.remove();
    console.log("[Ele-view Log] Previous fixed container removed."); // ★ログ追加
  }
  const absoluteContainer = document.getElementById(
    "ele-view-overlay-container-absolute"
  );
  if (absoluteContainer) {
    absoluteContainer.remove();
    console.log("[Ele-view Log] Previous absolute container (if any) removed."); // ★ログ追加
  }
}

// --- オーバーレイの描画処理 ---
function visualizeElements(tags, configs) {
  console.log("[Ele-view Log] visualizeElements called with tags:", tags); // ★ログ追加

  clearOverlays(); // 最初にクリア

  // アクティブ状態、タグ配列の存在、タグの数をチェック
  if (!isActive || !tags || tags.length === 0) {
    console.log(
      "[Ele-view Log] visualizeElements: Exiting - Not active or no tags selected."
    ); // ★ログ追加
    return; // 条件を満たさなければここで終了
  }
  console.log(
    "[Ele-view Log] visualizeElements: Proceeding - Active and tags present."
  ); // ★ログ追加

  // document.body の存在チェック
  if (!document.body) {
    console.error(
      "[Ele-view Log] visualizeElements: Exiting - document.body not found!"
    ); // ★ログ追加
    return; // body がなければここで終了
  }

  // コンテナ作成
  const fixedContainer = document.createElement("div");
  fixedContainer.id = CONTAINER_ID;
  // ... (コンテナのスタイル設定は変更なし) ...
  fixedContainer.style.position = "fixed";
  fixedContainer.style.top = "0";
  fixedContainer.style.left = "0";
  fixedContainer.style.width = "0";
  fixedContainer.style.height = "0";
  fixedContainer.style.zIndex = "99999";
  fixedContainer.style.pointerEvents = "none";
  document.body.appendChild(fixedContainer);
  console.log(
    "[Ele-view Log] visualizeElements: Fixed container created and appended."
  ); // ★ログ追加

  let overlaysDrawn = 0; // 描画されたオーバーレイの数をカウント

  // タグのループ
  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag);
    // ★見つかった要素の数をログに出力
    console.log(
      `[Ele-view Log] visualizeElements: Found <span class="math-inline">\{elements\.length\} elements for tag '</span>{tag}'.`
    );
    const config = configs[tag] || { color: "gray", zIndex: 99 };

    // 要素のループ
    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      // サイズゼロまたは画面外ならスキップ
      if (rect.width === 0 || rect.height === 0 || !isInViewport) {
        // console.log(`[Ele-view Log] Skipping element for tag '${tag}' (zero size or out of viewport).`); // スキップする場合の詳細ログ(任意)
        return; // 次の要素へ
      }

      // オーバーレイ作成とスタイル設定
      const overlay = document.createElement("div");
      overlay.classList.add("ele-view-overlay");
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = `2px solid ${config.color}`;
      overlay.style.zIndex = config.zIndex;
      overlay.style.pointerEvents = "none";
      overlay.style.boxSizing = "border-box";

      // コンテナにオーバーレイを追加
      fixedContainer.appendChild(overlay);
      overlaysDrawn++; // カウントアップ
      // console.log(`[Ele-view Log] Appended overlay for tag '${tag}'.`); // 各オーバーレイ追加時のログ(任意)
    });
  });

  // ★最終的に描画されたオーバーレイの数を出力
  console.log(
    `[Ele-view Log] visualizeElements: Finished loops. Total overlays drawn: ${overlaysDrawn}`
  );
}

// --- スクロール処理 (変更なし) ---
function handleScrollStop() {
  console.log("[Ele-view Log] Scroll stopped, triggering redraw."); // ★ログ追加
  visualizeElements(activeTags, activeConfigs);
}
const scrollListener = () => {
  clearTimeout(redrawTimeout);
  if (isActive) {
    redrawTimeout = setTimeout(handleScrollStop, DEBOUNCE_DELAY);
  }
};

// --- メッセージ受信処理 (変更なし) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ★メッセージ受信時のログを少し詳しく
  console.log(
    "[Ele-view Log] Message received in content script:",
    request.action,
    "with tags:",
    request.tags
  );
  if (request.action === "visualize") {
    activeTags = request.tags;
    activeConfigs = request.configs;
    isActive = true;
    visualizeElements(activeTags, activeConfigs); // 初期描画
    window.removeEventListener("scroll", scrollListener); // 念のため既存リスナー削除
    window.addEventListener("scroll", scrollListener, { passive: true });
    console.log(
      "[Ele-view Log] Visualize action processed, scroll listener added."
    ); // ★ログ追加
    sendResponse({ success: true });
  } else if (request.action === "clear") {
    isActive = false;
    window.removeEventListener("scroll", scrollListener);
    clearTimeout(redrawTimeout);
    clearOverlays();
    console.log(
      "[Ele-view Log] Clear action processed, scroll listener removed."
    ); // ★ログ追加
    sendResponse({ success: true });
  }
  return true;
});

// content.js が読み込まれたことを示すログ
console.log("[Ele-view Log] content script loaded."); // ★ログ追加
