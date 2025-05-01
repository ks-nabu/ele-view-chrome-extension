// content.js (最終版 - クリーンアップ＆コメント追加)

/**
 * @file Webページに注入され、オーバーレイの描画、クリア、スクロール時の再描画、
 * ポップアップからのメッセージ受信を担当します。
 */

// --- 定数 & グローバル変数 ---

/** @const {number} スクロール停止を判定する待機時間 (ミリ秒) */
const DEBOUNCE_DELAY = 150;
/** @const {number} パディング数値ラベルを表示する要素の最小幅/高さ (ピクセル) */
const MIN_SIZE_FOR_LABELS = 30;
/** @const {string} オーバーレイ要素を格納するコンテナのDOM ID */
const CONTAINER_ID = "ele-view-overlay-container-fixed";

/** @type {?number} デバウンス処理で使用するタイマーID */
let redrawTimeout = null;
/** @type {string[]} 現在表示対象となっているタグ名の配列 */
let activeTags = [];
/** @type {Object<string, {color: string, zIndex: number}>} アクティブなタグの設定 */
let activeConfigs = {};
/** @type {boolean} オーバーレイ表示が現在アクティブかどうかの状態 */
let isActive = false;
/** @type {boolean} パディング数値を表示するかどうかの設定 */
let shouldShowPaddingValues = false;

// --- ヘルパー関数 ---

/**
 * RGBAカラー文字列を受け取り、指定されたアルファ値を持つ新しいRGBA文字列を返す。
 * 不正な入力の場合は元の文字列を返す。
 * @param {string} rgbaString - 例: "rgba(255, 0, 0, 0.7)"
 * @param {number} alpha - 新しいアルファ値 (0.0 から 1.0)
 * @returns {string} - 例: "rgba(255, 0, 0, 0.15)"
 */
function setRgbaAlpha(rgbaString, alpha) {
  if (typeof rgbaString !== "string") return rgbaString;
  const match = rgbaString.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i
  );
  if (match) {
    const clampedAlpha = Math.max(0, Math.min(1, alpha)); // 0-1の範囲に丸める
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${clampedAlpha})`;
  }
  return rgbaString; // マッチしない場合は元の文字列
}

// --- DOM操作関数 ---

/**
 * ページに追加されたオーバーレイコンテナ（およびその中の全オーバーレイ）を削除します。
 */
function clearOverlays() {
  const fixedContainer = document.getElementById(CONTAINER_ID);
  if (fixedContainer) {
    fixedContainer.remove();
  }
  // 過去バージョン用の絶対コンテナが残っていればそれも削除 (念のため)
  const absoluteContainer = document.getElementById(
    "ele-view-overlay-container-absolute"
  );
  if (absoluteContainer) {
    absoluteContainer.remove();
  }
}

/**
 * 指定されたタグの要素を検索し、オーバーレイ（ボーダー、パディング背景、数値ラベル）を描画します。
 * 描画前に既存のオーバーレイはクリアされます。
 * @param {string[]} tags - 可視化対象のHTMLタグ名の配列
 * @param {Object<string, {color: string, zIndex: number}>} configs - タグごとの設定
 */
function visualizeElements(tags, configs) {
  // 既存のオーバーレイをクリア
  clearOverlays();

  // 状態チェック (非アクティブ、タグ未指定、タグ空配列)
  if (!isActive || !tags || tags.length === 0) {
    return; // 何も描画しない
  }

  // body要素がない場合はエラーを出して終了
  if (!document.body) {
    console.error("[Ele-view] visualizeElements: document.body not found!");
    return;
  }

  // オーバーレイを格納する fixed コンテナを作成
  const fixedContainer = document.createElement("div");
  fixedContainer.id = CONTAINER_ID;
  fixedContainer.style.position = "fixed"; // 画面基準で固定
  fixedContainer.style.top = "0";
  fixedContainer.style.left = "0";
  fixedContainer.style.width = "0"; // コンテナ自体はサイズを持たない
  fixedContainer.style.height = "0";
  fixedContainer.style.zIndex = "99999"; // 他の要素より手前に
  fixedContainer.style.pointerEvents = "none"; // マウスイベントを透過
  document.body.appendChild(fixedContainer);

  // 描画カウンター初期化
  let bordersDrawn = 0;
  let paddingBoxesDrawn = 0;
  let labelsDrawn = 0;

  // 指定されたタグごとにループ
  tags.forEach((tag) => {
    const elements = document.querySelectorAll(tag); // ページ内の該当タグ要素をすべて取得
    // タグ設定を取得 (なければデフォルト)
    const config = configs[tag] || { color: "gray", zIndex: 99 };
    // z-indexを定義 (ラベル > ボーダー > パディングBOX)
    const borderZIndex = config.zIndex;
    const paddingZIndex = config.zIndex - 1;
    const labelZIndex = config.zIndex + 1;

    // ラベル共通スタイル (フォント、色、背景など)
    const commonLabelStyle = {
      position: "absolute",
      pointerEvents: "none",
      color: "white",
      fontSize: "10px",
      fontFamily: "monospace",
      padding: "1px 3px",
      borderRadius: "2px",
      zIndex: String(labelZIndex),
      whiteSpace: "nowrap", // 改行しない
    };
    // このタグに対応するラベルの背景色を生成 (アルファ値 0.5)
    const labelBackgroundColor = setRgbaAlpha(config.color, 0.5);

    // 見つかった要素ごとにループ
    elements.forEach((element) => {
      // 要素の位置とサイズ、計算済みスタイルを取得
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);

      // 画面内に表示されているか簡易チェック
      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      // サイズがない、または画面外の要素はスキップ
      if (rect.width === 0 || rect.height === 0 || !isInViewport) {
        return; // 次の要素へ
      }

      // --- 1. ボーダーオーバーレイを描画 ---
      const borderOverlay = document.createElement("div");
      borderOverlay.classList.add(
        "ele-view-overlay",
        "ele-view-border-overlay"
      );
      borderOverlay.style.position = "absolute"; // コンテナ内で絶対配置
      borderOverlay.style.left = `${rect.left}px`; // ビューポート座標
      borderOverlay.style.top = `${rect.top}px`; // ビューポート座標
      borderOverlay.style.width = `${rect.width}px`;
      borderOverlay.style.height = `${rect.height}px`;
      borderOverlay.style.border = `2px solid ${config.color}`; // 2pxボーダー
      borderOverlay.style.backgroundColor = "transparent"; // 背景は透明
      borderOverlay.style.zIndex = String(borderZIndex); // z-index設定
      borderOverlay.style.pointerEvents = "none";
      borderOverlay.style.boxSizing = "border-box"; // ボーダーを含めてサイズ計算
      fixedContainer.appendChild(borderOverlay);
      bordersDrawn++;

      // --- 2. パディングBOXオーバーレイを描画 (パディングがある場合) ---
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;

      // どれか一つでもパディングがあれば描画を試みる
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
        paddingBox.style.border = "none"; // 枠線なし

        // コンテンツ領域の計算
        const boxTop = rect.top + paddingTop;
        const boxLeft = rect.left + paddingLeft;
        const boxWidth = rect.width - paddingLeft - paddingRight;
        const boxHeight = rect.height - paddingTop - paddingBottom;

        // 計算後のサイズが正の場合のみ描画
        if (boxWidth > 0 && boxHeight > 0) {
          paddingBox.style.left = `${boxLeft}px`;
          paddingBox.style.top = `${boxTop}px`;
          paddingBox.style.width = `${boxWidth}px`;
          paddingBox.style.height = `${boxHeight}px`;
          // 背景色をボーダー色ベースの薄い半透明色に設定 (アルファ 15%)
          paddingBox.style.backgroundColor = setRgbaAlpha(config.color, 0.15);
          paddingBox.style.zIndex = String(paddingZIndex); // ボーダーより奥
          fixedContainer.appendChild(paddingBox);
          paddingBoxesDrawn++;
        }
      }

      // --- 3. パディング数値ラベルを描画 (設定が有効 & 要素サイズが十分な場合) ---
      if (
        shouldShowPaddingValues &&
        rect.width >= MIN_SIZE_FOR_LABELS &&
        rect.height >= MIN_SIZE_FOR_LABELS
      ) {
        // この要素/タグ用のラベルスタイル (共通スタイル + 計算済み背景色)
        const labelStyle = {
          ...commonLabelStyle,
          backgroundColor: labelBackgroundColor,
        };

        // 上パディングラベル
        if (paddingTop > 0) {
          const topLabel = document.createElement("span");
          topLabel.textContent = `${paddingTop}px`;
          Object.assign(topLabel.style, labelStyle);
          topLabel.style.top = `${rect.top + 2}px`; // 上端内側
          topLabel.style.left = `${rect.left + rect.width / 2}px`; // 水平中央
          topLabel.style.transform = "translateX(-50%)";
          fixedContainer.appendChild(topLabel);
          labelsDrawn++;
        }
        // 下パディングラベル
        if (paddingBottom > 0) {
          const bottomLabel = document.createElement("span");
          bottomLabel.textContent = `${paddingBottom}px`;
          Object.assign(bottomLabel.style, labelStyle);
          const approxLabelHeight = 16; // 調整済みのラベル高さ
          bottomLabel.style.top = `${rect.top + rect.height - approxLabelHeight - 2}px`; // 下端内側
          bottomLabel.style.left = `${rect.left + rect.width / 2}px`; // 水平中央
          bottomLabel.style.transform = "translateX(-50%)";
          fixedContainer.appendChild(bottomLabel);
          labelsDrawn++;
        }
        // 左パディングラベル
        if (paddingLeft > 0) {
          const leftLabel = document.createElement("span");
          leftLabel.textContent = `${paddingLeft}px`;
          Object.assign(leftLabel.style, labelStyle);
          leftLabel.style.left = `${rect.left + 2}px`; // 左端内側
          leftLabel.style.top = `${rect.top + rect.height / 2}px`; // 垂直中央
          leftLabel.style.transform = "translateY(-50%)";
          fixedContainer.appendChild(leftLabel);
          labelsDrawn++;
        }
        // 右パディングラベル
        if (paddingRight > 0) {
          const rightLabel = document.createElement("span");
          rightLabel.textContent = `${paddingRight}px`;
          Object.assign(rightLabel.style, labelStyle);
          rightLabel.style.left = `${rect.left + rect.width - 2}px`; // 右端内側基点
          rightLabel.style.top = `${rect.top + rect.height / 2}px`; // 垂直中央
          rightLabel.style.transform = "translate(-100%, -50%)"; // 左にずらして右揃え
          fixedContainer.appendChild(rightLabel);
          labelsDrawn++;
        }
      } // End if shouldShowPaddingValues
    }); // End elements.forEach
  }); // End tags.forEach

  // console.log(`[Ele-view Log] visualizeElements: Finished. Borders: ${bordersDrawn}, Padding Boxes: ${paddingBoxesDrawn}, Labels: ${labelsDrawn}`);
} // End visualizeElements

// --- スクロール停止検知 & 再描画処理 ---

/** スクロール停止後に visualizeElements を呼び出す関数 */
function handleScrollStop() {
  // console.log("[Ele-view Log] Scroll stopped, triggering redraw.");
  visualizeElements(activeTags, activeConfigs);
}

/** スクロールイベントを監視し、デバウンス処理を行うリスナー関数 */
const scrollListener = () => {
  // 既存の再描画タイマーをクリア
  clearTimeout(redrawTimeout);
  // オーバーレイがアクティブな場合のみ、指定時間後に再描画をスケジュール
  if (isActive) {
    redrawTimeout = setTimeout(handleScrollStop, DEBOUNCE_DELAY);
  }
};

// --- ポップアップからのメッセージ受信処理 ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("[Ele-view Log] Message received:", request.action);
  if (request.action === "visualize") {
    // 状態を更新
    activeTags = request.tags;
    activeConfigs = request.configs;
    shouldShowPaddingValues = request.showPaddingValues === true;
    isActive = true;
    // 初期描画を実行
    visualizeElements(activeTags, activeConfigs);
    // スクロールリスナーを登録（念のため既存を削除してから）
    window.removeEventListener("scroll", scrollListener);
    window.addEventListener("scroll", scrollListener, { passive: true });
    // console.log("[Ele-view Log] Visualize processed. Show padding:", shouldShowPaddingValues);
    sendResponse({ success: true }); // 処理成功を通知
  } else if (request.action === "clear") {
    // 状態をリセット
    isActive = false;
    // スクロールリスナーを解除
    window.removeEventListener("scroll", scrollListener);
    // 待機中の再描画タイマーがあればキャンセル
    clearTimeout(redrawTimeout);
    // オーバーレイをクリア
    clearOverlays();
    // console.log("[Ele-view Log] Clear processed.");
    sendResponse({ success: true }); // 処理成功を通知
  }
  // 非同期応答を示すためにtrueを返す
  return true;
});

// --- 初期読み込みログ ---
// console.log("[Ele-view Log] content script loaded.");
