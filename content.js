// content.js (パディング可視化機能を追加)

// --- 設定と状態管理 (変更なし) ---
const DEBOUNCE_DELAY = 150;
let redrawTimeout = null;
let activeTags = [];
let activeConfigs = {};
let isActive = false;
const CONTAINER_ID = "ele-view-overlay-container-fixed";

// --- ★ Helper Function: RGBA文字列のアルファ値(透明度)を変更 ---
/**
 * RGBAカラー文字列を受け取り、指定されたアルファ値を持つ新しいRGBA文字列を返す
 * @param {string} rgbaString - 例: "rgba(255, 0, 0, 0.7)"
 * @param {number} alpha - 新しいアルファ値 (0.0 から 1.0)
 * @returns {string} - 例: "rgba(255, 0, 0, 0.15)"、不正な入力の場合は元の文字列
 */
function setRgbaAlpha(rgbaString, alpha) {
  // 文字列でない場合や形式が違う場合はそのまま返す
  if (typeof rgbaString !== "string") return rgbaString;
  // RGBA形式にマッチするか確認 (RGB形式も許容)
  const match = rgbaString.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i
  );
  if (match) {
    // アルファ値を0から1の範囲に収める
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${clampedAlpha})`;
  }
  return rgbaString; // マッチしない場合は元の文字列を返す
}

// --- オーバーレイのクリア処理 (変更なし) ---
function clearOverlays() {
  console.log("[Ele-view Log] clearOverlays called.");
  const fixedContainer = document.getElementById(CONTAINER_ID);
  if (fixedContainer) {
    fixedContainer.remove();
    console.log("[Ele-view Log] Previous fixed container removed.");
  }
  const absoluteContainer = document.getElementById(
    "ele-view-overlay-container-absolute"
  );
  if (absoluteContainer) {
    absoluteContainer.remove();
    console.log("[Ele-view Log] Previous absolute container (if any) removed.");
  }
}

// --- ★ オーバーレイの描画処理 (パディングBOX追加) ---
function visualizeElements(tags, configs) {
  console.log("[Ele-view Log] visualizeElements called with tags:", tags);

  clearOverlays(); // 最初にクリア

  if (!isActive || !tags || tags.length === 0) {
    console.log(
      "[Ele-view Log] visualizeElements: Exiting - Not active or no tags selected."
    );
    return;
  }
  console.log(
    "[Ele-view Log] visualizeElements: Proceeding - Active and tags present."
  );

  if (!document.body) {
    console.error(
      "[Ele-view Log] visualizeElements: Exiting - document.body not found!"
    );
    return;
  }

  // Fixedコンテナを作成
  const fixedContainer = document.createElement("div");
  fixedContainer.id = CONTAINER_ID;
  // ... (コンテナスタイル設定は変更なし) ...
  fixedContainer.style.position = "fixed";
  fixedContainer.style.top = "0";
  fixedContainer.style.left = "0";
  fixedContainer.style.width = "0";
  fixedContainer.style.height = "0";
  fixedContainer.style.zIndex = "99999"; // コンテナ自体のz-index
  fixedContainer.style.pointerEvents = "none";
  document.body.appendChild(fixedContainer);
  console.log(
    "[Ele-view Log] visualizeElements: Fixed container created and appended."
  );

  let bordersDrawn = 0; // 描画したボーダー数をカウント
  let paddingBoxesDrawn = 0; // 描画したパディングBOX数をカウント

  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag);
    console.log(
      `[Ele-view Log] visualizeElements: Found ${elements.length} elements for tag '${tag}'.`
    );
    const config = configs[tag] || { color: "gray", zIndex: 99 };
    // ボーダーとパディングBOXのz-indexを定義 (ボーダーが手前)
    const borderZIndex = config.zIndex;
    const paddingZIndex = config.zIndex - 1; // ボーダーより1つ奥

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect(); // ボーダーボックス基準の位置とサイズ
      const styles = getComputedStyle(element); // 計算済みスタイルを取得

      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      if (rect.width === 0 || rect.height === 0 || !isInViewport) {
        return; // スキップ
      }

      // --- 1. ボーダーオーバーレイを作成 ---
      const borderOverlay = document.createElement("div");
      borderOverlay.classList.add(
        "ele-view-overlay",
        "ele-view-border-overlay"
      );
      borderOverlay.style.position = "absolute";
      borderOverlay.style.left = `${rect.left}px`;
      borderOverlay.style.top = `${rect.top}px`;
      borderOverlay.style.width = `${rect.width}px`;
      borderOverlay.style.height = `${rect.height}px`;
      borderOverlay.style.border = `2px solid ${config.color}`;
      borderOverlay.style.backgroundColor = "transparent"; // ★ 背景は透明に
      borderOverlay.style.zIndex = String(borderZIndex); // z-index設定
      borderOverlay.style.pointerEvents = "none";
      borderOverlay.style.boxSizing = "border-box";
      fixedContainer.appendChild(borderOverlay);
      bordersDrawn++;

      // --- 2. パディングBOXオーバーレイを作成 (パディングがあれば) ---
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;

      // いずれかのpaddingが0より大きい場合のみ描画
      if (
        paddingTop > 0 ||
        paddingRight > 0 ||
        paddingBottom > 0 ||
        paddingLeft > 0
      ) {
        const paddingBox = document.createElement("div");
        paddingBox.classList.add("ele-view-overlay", "ele-view-padding-box");
        paddingBox.style.position = "absolute";
        paddingBox.style.pointerEvents = "none";
        paddingBox.style.boxSizing = "border-box";
        paddingBox.style.border = "none"; // パディングBOX自体に枠線は不要

        // パディングの内側（コンテンツ領域）の座標とサイズを計算
        const boxTop = rect.top + paddingTop;
        const boxLeft = rect.left + paddingLeft;
        // 幅 = 全体幅 - 左パディング - 右パディング
        const boxWidth = rect.width - paddingLeft - paddingRight;
        // 高さ = 全体高さ - 上パディング - 下パディング
        const boxHeight = rect.height - paddingTop - paddingBottom;

        // 計算後の幅と高さが0より大きい場合のみ描画
        if (boxWidth > 0 && boxHeight > 0) {
          paddingBox.style.left = `${boxLeft}px`;
          paddingBox.style.top = `${boxTop}px`;
          paddingBox.style.width = `${boxWidth}px`;
          paddingBox.style.height = `${boxHeight}px`;

          // ★ 背景色を設定 (ヘルパー関数でボーダー色を半透明化、例: alpha 0.15)
          paddingBox.style.backgroundColor = setRgbaAlpha(config.color, 0.15);

          paddingBox.style.zIndex = String(paddingZIndex); // ★ ボーダーより低いz-index

          fixedContainer.appendChild(paddingBox);
          paddingBoxesDrawn++;
        }
      }
    });
  });

  // ★ 最終的な描画数をログに出力
  console.log(
    `[Ele-view Log] visualizeElements: Finished loops. Borders drawn: ${bordersDrawn}, Padding Boxes drawn: ${paddingBoxesDrawn}`
  );
}

// --- スクロール処理 (変更なし) ---
function handleScrollStop() {
  console.log("[Ele-view Log] Scroll stopped, triggering redraw.");
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
    );
    sendResponse({ success: true });
  } else if (request.action === "clear") {
    isActive = false;
    window.removeEventListener("scroll", scrollListener);
    clearTimeout(redrawTimeout);
    clearOverlays();
    console.log(
      "[Ele-view Log] Clear action processed, scroll listener removed."
    );
    sendResponse({ success: true });
  }
  return true;
});

// --- 初期読み込みログ (変更なし) ---
console.log("[Ele-view Log] content script loaded.");
