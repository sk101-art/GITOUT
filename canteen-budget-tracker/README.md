# 🥟 BiteBudget - Premium Student Canteen Tracker PWA

BiteBudget is an ultra-vibrant, mobile-first Progressive Web App (PWA) tailored specifically for students to track micro-transactions at canteen counters. It eliminates the friction of traditional budgeting apps by providing rapid 1-tap logging presets, a standalone dashboard camera QR scanner, dynamic weekly SVG charting, and an Android-native SMS budget breach alerting gateway.

---

## ✨ Features

### 1. 📸 Rapid Standalone Scan & Pay
- Tap the glowing **"RAPID SCAN & PAY"** card right on the dashboard to immediately open the live back-camera stream!
- Simulates scanning counter QR codes, playing a Web Audio register beep, and flashing a success tick receipt before logging.
- Includes a **Simulate Counter Scan** manual button for seamless emulation on desktop systems.

### 2. ➕ Dynamic Snack Preset Manager
- Edit preset names and costs in real-time.
- Add completely new canteen food options (e.g. *Burger 🍔*, *Cold Coffee ☕*) directly in settings, instantly generating 1-tap counter presets on the dashboard!
- Tap the red trash icon next to any preset in settings to delete it.

### 3. 📲 Android-Native SMS alert Gateway
- Configure your parent/guardian name, target mobile, and bank credentials.
- Write a customized SMS template using dynamic variables: `{name}`, `{bank}`, `{acct}`, `{spent}`, and `{limit}`.
- If today's spend exceeds your daily budget limit, an overlay notification modal triggers. Tapping the CTA instantly opens your native Android Messaging client pre-filled with the alert message, ready to send!

### 4. 📋 "No-Panic" Parent Peace-of-Mind Summarizer
- Solves monthly money arguments! Dynamically parses monthly spends, daily averages, and stall categories into a wholesome, readable summary.
- Instantly copy the text ledger or open a WhatsApp API compose window pre-filled with the update in 1 click.

### 5. 🎨 Vibrant Cyberpunk Glassmorphism
- Neon cyan, electric purple, and hot pink gradients.
- Tactile scale-down buttons simulating Android haptic taps.
- Liquid animating circular budget progress gauge.

---

## 📂 File Directory

- `index.html` - Structural core and inline SVG HUD assets.
- `style.css` - Custom responsive design systems and sweeps.
- `app.js` - State engine, LocalStorage operations, Web Audio beep generator, and camera feeds.
- `manifest.json` - PWA Android installation standalone profiles.
- `sw.js` - Service Worker caching files for offline cafeterial checkouts.
- `icon.png` - Futuristic circular app logo.
- `.gitignore` - Standard OS metadata filter.

---

## 🚀 How to Run Locally

Since BiteBudget is built in vanilla HTML, JS, and CSS, it has **zero package dependencies** and starts instantly!

1. Open your terminal in the project directory.
2. Spin up a static web server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to:  
   **`http://localhost:8000`**

---

## 📱 How to Install on Android Phone

1. Connect your computer and your phone to the same Wi-Fi network.
2. Locate your computer's local IP address (e.g., `192.168.1.15`).
3. Open Google Chrome on your Android phone and go to:  
   `http://<YOUR_COMPUTER_IP>:8000`
4. Tap the **"Add BiteBudget to Home Screen"** prompt that slides up (or select it from Chrome's options).
5. Pinned directly to your Android launcher, it launches fullscreen as a standalone app!
