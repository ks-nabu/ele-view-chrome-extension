# Ele-view Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Chrome extension to visualize the boundaries and padding of specified HTML elements on the current web page. Designed to help web developers and designers understand layout structure more easily.

## Features

* Visualize element boundaries with a **2px border**. Colors are configurable per tag.
* Highlight **padding areas** with a semi-transparent background derived from the border color.
* Display **padding values** (in pixels) inside the element border (can be toggled on/off).
* Supports common HTML block/structural elements (`div`, `p`, `section`, `header`, `footer`, `h1-h4`, `ul`, `ol`, `li`, `table`, `th`, `td`).
* Select multiple tags to visualize simultaneously via the popup menu.
* "Select All" option for convenience.
* **Redraws automatically** after scrolling stops to accurately reflect the current view.
* **Dark mode support** based on your system preference.
* User interface localized for **English** and **Japanese** (based on browser language, set via JavaScript).
* Saves your selected tags and display settings (padding value visibility) locally.

## Installation

**From Source (Recommended for now):**

1.  Download the latest release ZIP file from the [Releases page](https://github.com/ks-nabu/ele-view-chrome-extension/releases) (replace with your actual link later) or clone/download the source code from this repository.
2.  If you downloaded the source code (not the release ZIP), you might need to build the Tailwind CSS first (see Development section). The release ZIP should contain the pre-built CSS.
3.  Extract the ZIP file if you downloaded one.
4.  Open Chrome and navigate to `chrome://extensions`.
5.  Enable **Developer mode** using the toggle switch in the top right corner.
6.  Click the **Load unpacked** button.
7.  Select the directory containing the extension files (the folder with `manifest.json` inside).
8.  The "Ele-view" extension should now appear in your extensions list and toolbar.

**From Chrome Web Store:**

*(Not yet available. A link will be added here if published.)*

## Usage

1.  Navigate to the web page where you want to visualize elements.
2.  Click the Ele-view extension icon (puzzle piece icon might hide it initially) in your Chrome toolbar to open the popup.
3.  Check the boxes next to the HTML tags you want to visualize (e.g., `div`, `p`, `section`). Use "Select All" if needed.
4.  (Optional) Check the "Show padding values" box if you want to see the numerical padding values displayed.
5.  Click the **Show (Redraw)** button.
6.  Overlays (borders, padding background, padding values if enabled) will appear on the page for the selected elements currently visible in the viewport.
7.  If you scroll the page, the overlays will disappear or remain static until you stop scrolling. They will then redraw automatically shortly after the scroll stops to match the new view.
8.  Click the **Hide** button in the popup to remove all overlays and stop the scroll listener.
9.  Your tag selections and the padding value display setting are saved automatically for your next use.

## Development

If you want to modify or contribute to the extension:

1.  Clone the repository: `git clone https://github.com/ks-nabu/ele-view-chrome-extension.git` (Replace URL)
2.  Navigate to the project directory: `cd ele-view-chrome-extension` (or your folder name)
3.  Install development dependencies (Tailwind CSS):
    ```bash
    npm install
    ```
4.  If you modify `popup.html` (adding/changing Tailwind classes) or `tailwind.config.js`, you need to rebuild the CSS using the input file (`input.css`):
    ```bash
    # For a single build
    npx tailwindcss -i ./input.css -o ./tailwind.css

    # Or to automatically watch for changes during development
    npx tailwindcss -i ./input.css -o ./tailwind.css --watch
    ```
5.  Load the extension into Chrome using the "Load unpacked" method described in the Installation section, pointing it to your local project directory. Remember to reload the extension manually in `chrome://extensions` after making changes to JavaScript files or `manifest.json`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

* Uses [Tailwind CSS](https://tailwindcss.com/) for popup styling.