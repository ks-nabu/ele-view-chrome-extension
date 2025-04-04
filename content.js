// content.js (パディング数値表示機能を追加 - 完全版)

// --- 設定と状態管理 ---
const DEBOUNCE_DELAY = 150; // スクロール停止後、再描画までの待機時間 (ミリ秒)
let redrawTimeout = null; // デバウンス用タイマーID
let activeTags = []; // 現在表示対象のタグ
let activeConfigs = {}; // 現在のタグ設定 (色, zIndex)
let isActive = false; // オーバーレイが有効かどうかのフラグ
let shouldShowPaddingValues = false; // パディング数値を表示するかどうか
const MIN_SIZE_FOR_LABELS = 30; // ラベルを表示する最小サイズ (ピクセル)
const CONTAINER_ID = "ele-view-overlay-container-fixed"; // コンテナID

// --- Helper Function: RGBA文字列のアルファ値(透明度)を変更 ---
/**
 * RGBAカラー文字列を受け取り、指定されたアルファ値を持つ新しいRGBA文字列を返す
 * @param {string} rgbaString - 例: "rgba(255, 0, 0, 0.7)"
 * @param {number} alpha - 新しいアルファ値 (0.0 から 1.0)
 * @returns {string} - 例: "rgba(255, 0, 0, 0.15)"、不正な入力の場合は元の文字列
 */
function setRgbaAlpha(rgbaString, alpha) {
  if (typeof rgbaString !== "string") return rgbaString;
  const match = rgbaString.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i
  );
  if (match) {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${clampedAlpha})`;
  }
  return rgbaString;
}

// --- オーバーレイのクリア処理 ---
function clearOverlays() {
  // console.log("[Ele-view Log] clearOverlays called.");
  const fixedContainer = document.getElementById(CONTAINER_ID);
  if (fixedContainer) {
    fixedContainer.remove();
    // console.log("[Ele-view Log] Previous fixed container removed.");
  }
  const absoluteContainer = document.getElementById(
    "ele-view-overlay-container-absolute"
  );
  if (absoluteContainer) {
    absoluteContainer.remove();
    // console.log("[Ele-view Log] Previous absolute container (if any) removed.");
  }
}

// --- オーバーレイの描画処理 (パディング数値ラベル追加) ---
function visualizeElements(tags, configs) {
  // console.log("[Ele-view Log] visualizeElements called. Show padding values:", shouldShowPaddingValues);

  clearOverlays(); // 最初にクリア

  if (!isActive || !tags || tags.length === 0) {
    // console.log("[Ele-view Log] visualizeElements: Exiting - Not active or no tags selected.");
    return;
  }
  // console.log("[Ele-view Log] visualizeElements: Proceeding.");

  if (!document.body) {
    console.error(
      "[Ele-view Log] visualizeElements: Exiting - document.body not found!"
    );
    return;
  }

  // Fixedコンテナを作成
  const fixedContainer = document.createElement("div");
  fixedContainer.id = CONTAINER_ID;
  fixedContainer.style.position = "fixed";
  fixedContainer.style.top = "0";
  fixedContainer.style.left = "0";
  fixedContainer.style.width = "0";
  fixedContainer.style.height = "0";
  fixedContainer.style.zIndex = "99999"; // コンテナ自体のz-index
  fixedContainer.style.pointerEvents = "none";
  document.body.appendChild(fixedContainer);
  // console.log("[Ele-view Log] visualizeElements: Fixed container created.");

  let bordersDrawn = 0;
  let paddingBoxesDrawn = 0;
  let labelsDrawn = 0;

  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag);
    // console.log(`[Ele-view Log] Found ${elements.length} elements for tag '${tag}'.`);
    const config = configs[tag] || { color: "gray", zIndex: 99 };
    const borderZIndex = config.zIndex;
    const paddingZIndex = config.zIndex - 1;
    const labelZIndex = config.zIndex + 1; // ラベルは最前面に

    // ★★★ ラベルの共通スタイルを定義（背景色を除く）★★★
    const commonLabelStyle = {
      position: "absolute",
      pointerEvents: "none",
      // backgroundColor は後で設定
      color: "white", // 文字色は白のまま（多くの背景色で見やすいはず）
      fontSize: "10px",
      fontFamily: "monospace",
      padding: "1px 3px",
      borderRadius: "2px",
      zIndex: String(labelZIndex),
      whiteSpace: "nowrap",
    };
    // ★★★ このタグのボーダー色からラベル背景色を生成 ★★★
    const labelBackgroundColor = setRgbaAlpha(config.color, 0.5); // Alpha 65%

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      if (rect.width === 0 || rect.height === 0 || !isInViewport) {
        return;
      }

      // --- 1. ボーダーオーバーレイ作成 ---
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
      borderOverlay.style.backgroundColor = "transparent";
      borderOverlay.style.zIndex = String(borderZIndex);
      borderOverlay.style.pointerEvents = "none";
      borderOverlay.style.boxSizing = "border-box";
      fixedContainer.appendChild(borderOverlay);
      bordersDrawn++;

      // --- 2. パディングBOXオーバーレイ作成 ---
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;

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
        paddingBox.style.border = "none";
        const boxTop = rect.top + paddingTop;
        const boxLeft = rect.left + paddingLeft;
        const boxWidth = rect.width - paddingLeft - paddingRight;
        const boxHeight = rect.height - paddingTop - paddingBottom;

        if (boxWidth > 0 && boxHeight > 0) {
          paddingBox.style.left = `${boxLeft}px`;
          paddingBox.style.top = `${boxTop}px`;
          paddingBox.style.width = `${boxWidth}px`;
          paddingBox.style.height = `${boxHeight}px`;
          paddingBox.style.backgroundColor = setRgbaAlpha(config.color, 0.15); // Alpha 15%
          paddingBox.style.zIndex = String(paddingZIndex);
          fixedContainer.appendChild(paddingBox);
          paddingBoxesDrawn++;
        }
      }

      // --- 3. パディング数値ラベル作成 (条件付き) ---
      if (
        shouldShowPaddingValues &&
        rect.width >= MIN_SIZE_FOR_LABELS &&
        rect.height >= MIN_SIZE_FOR_LABELS
      ) {
        // ★★★ この要素/タグ用の完全なラベルスタイルを作成 ★★★
        const labelStyle = {
          ...commonLabelStyle, // 共通スタイルをコピー
          backgroundColor: labelBackgroundColor, // 計算した背景色を設定
        };
        // 上パディングラベル (要素上端の内側、左右中央)
        if (paddingTop > 0) {
          const topLabel = document.createElement("span");
          topLabel.textContent = `${paddingTop}px`;
          Object.assign(topLabel.style, labelStyle);
          topLabel.style.top = `${rect.top + 2}px`; // 上端から少し内側
          topLabel.style.left = `${rect.left + rect.width / 2}px`; // 水平中央基点
          topLabel.style.transform = "translateX(-50%)"; // 水平中央揃え
          fixedContainer.appendChild(topLabel);
          labelsDrawn++;
        }
        // 下パディングラベル (要素下端の内側、左右中央)
        if (paddingBottom > 0) {
          const bottomLabel = document.createElement("span");
          bottomLabel.textContent = `${paddingBottom}px`;
          Object.assign(bottomLabel.style, labelStyle);
          // ラベル自身の高さを考慮して下端から配置 (font-size 10px + padding 1px*2 = ~12px と仮定)
          const approxLabelHeight = 26;
          bottomLabel.style.top = `${rect.top + rect.height - approxLabelHeight - 2}px`; // 下端から少し内側
          bottomLabel.style.left = `${rect.left + rect.width / 2}px`; // 水平中央基点
          bottomLabel.style.transform = "translateX(-50%)"; // 水平中央揃え
          fixedContainer.appendChild(bottomLabel);
          labelsDrawn++;
        }
        // 左パディングラベル (要素左端の内側、上下中央)
        if (paddingLeft > 0) {
          const leftLabel = document.createElement("span");
          leftLabel.textContent = `${paddingLeft}px`;
          Object.assign(leftLabel.style, labelStyle);
          leftLabel.style.left = `${rect.left + 2}px`; // 左端から少し内側
          leftLabel.style.top = `${rect.top + rect.height / 2}px`; // 垂直中央基点
          leftLabel.style.transform = "translateY(-50%)"; // 垂直中央揃え
          fixedContainer.appendChild(leftLabel);
          labelsDrawn++;
        }
        // ★ 右パディングラベル (位置調整: left + transform 使用) ★
        if (paddingRight > 0) {
          const rightLabel = document.createElement("span");
          rightLabel.textContent = `${paddingRight}px`;
          Object.assign(rightLabel.style, labelStyle);
          // 要素の右端から少し内側を「左端の基準」とする
          rightLabel.style.left = `${rect.left + rect.width - 2}px`;
          rightLabel.style.top = `${rect.top + rect.height / 2}px`; // 縦方向中央基点
          // transformを使って、ラベル自身の幅(100%)だけ左に移動し、さらに縦方向中央に揃える
          rightLabel.style.transform = "translate(-100%, -50%)";
          fixedContainer.appendChild(rightLabel);
          labelsDrawn++;
        }
      }
    });
  });

  // console.log(`[Ele-view Log] visualizeElements: Finished. Borders: ${bordersDrawn}, Padding Boxes: ${paddingBoxesDrawn}, Labels: ${labelsDrawn}`);
}

// --- スクロール処理 ---
function handleScrollStop() {
  // console.log("[Ele-view Log] Scroll stopped, triggering redraw.");
  visualizeElements(activeTags, activeConfigs);
}
const scrollListener = () => {
  clearTimeout(redrawTimeout);
  if (isActive) {
    redrawTimeout = setTimeout(handleScrollStop, DEBOUNCE_DELAY);
  }
};

// --- メッセージ受信処理 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("[Ele-view Log] Message received:", request.action);
  if (request.action === "visualize") {
    activeTags = request.tags;
    activeConfigs = request.configs;
    // パディング表示フラグを更新
    shouldShowPaddingValues = request.showPaddingValues === true;
    isActive = true;
    visualizeElements(activeTags, activeConfigs); // 初期描画
    window.removeEventListener("scroll", scrollListener); // 既存リスナー削除
    window.addEventListener("scroll", scrollListener, { passive: true }); // リスナー登録
    // console.log("[Ele-view Log] Visualize processed. Show padding:", shouldShowPaddingValues);
    sendResponse({ success: true });
  } else if (request.action === "clear") {
    isActive = false;
    window.removeEventListener("scroll", scrollListener);
    clearTimeout(redrawTimeout);
    clearOverlays();
    // console.log("[Ele-view Log] Clear processed.");
    sendResponse({ success: true });
  }
  return true; // 非同期応答の可能性を示す
});

// --- 初期読み込みログ ---
// console.log("[Ele-view Log] content script loaded.");
