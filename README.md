# Redeem itch.io (English)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/drowfear)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b.svg?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/drowfear)

An automated Tampermonkey userscript designed to scan, expand, and batch-claim free games, promotional bundles, and claimable keys on **itch.io** and external deal aggregation platforms.

---

## Key Features

- **⚡ Live Progress Panel & Batch Claiming:** Includes a floating UI panel with real-time status updates (Claimed, Already Owned, Skipped, Errors) and speed selection (*Safe / Fast / Turbo*).
- **🚀 Parallel Execution:** Claims multiple games simultaneously in the background without opening dozens of tabs.
- **📦 Bundle Expansion:** Automatically detects itch.io promotional bundle links (`/s/`), extracts all individual games, and claims them sequentially.
- **🌐 Third-Party Deal Tracker Support:** Automatically injects quick "Claim" buttons next to itch.io links on deal trackers and community forums.
- **🔑 Direct Key Resolution:** Bypasses manual checkout steps by interacting directly with the `download_url` and CSRF endpoints.
- **⚙️ Tampermonkey Menu Command:** Integrated options in the extension menu to batch-claim all itch.io links present on the current active tab.

---

## Supported Websites

* `itch.io` (and subdomains)
* Keylol (`keylol.com`)
* SteamGifts (`steamgifts.com/discussion/*`)
* Reddit (`reddit.com/r/*`)
* ItchClaim (`itchclaim.tmbpeter.com`)
* ShaiGrOrb Tracker (`shaigrorb.github.io/freetchio/`)

---

## Installation

1. Install a userscript manager extension in your web browser:
   * **[Tampermonkey](https://www.tampermonkey.net/)** (Recommended)
2. Install the userscript directly from the repository:
   * **[Install Script (redeem-itch.user.js)](https://raw.githubusercontent.com/drowfear/Itch.io-Auto-Redeem/main/redeem-itch.user.js)**
3. Confirm the installation when prompted by Tampermonkey.

---

## Usage Guide

1. **On itch.io / Bundle pages:** Click the *"Claim in Background"* button added to store/bundle pages, or use the *"⚡ Claim All Links On Page"* button from the floating banner.
2. **On external sites (Reddit, Keylol, etc.):** Click the green **"Claim"** buttons injected next to itch.io links.
3. **Speed Controls:** Adjust the concurrency setting in the top banner:
   * **Safe (3):** Low rate-limit risk.
   * **Fast (6):** Balanced performance (Default).
   * **Turbo (10):** Maximum batch speed.

---

## Support My Work

If this script saved you time and you'd like to support future updates:
* ☕ **[Buy Me a Coffee](https://buymeacoffee.com/drowfear)**
* ❤️ **[Ko-fi](https://ko-fi.com/drowfear)**

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
