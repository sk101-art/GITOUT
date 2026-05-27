/* ==========================================================================
   BITEBUDGET: FRONTEND CORE LOGIC & STATE ENGINE
   Features: LocalStorage engine, responsive SVG charting, Android keypad simulator, 
             PWA service worker, Parent Report compiler.
   ========================================================================== */

// --- GLOBAL STATE ---
let state = {
  currency: '₹',
  dailyLimit: 250,
  cardBalance: 450,
  smsEnabled: true,
  smsRecipientName: 'Mom & Dad',
  smsRecipient: '+91 98765 43210',
  smsBankName: 'State Bank of India',
  smsBankAccount: 'A/C **9314',
  smsTemplate: 'ALERT from {bank} ({acct}): {name}, I have exceeded my daily budget limit at the canteen. Spent: {spent} / Limit: {limit}.',
  smsHistory: [],
  isDirectScan: false,
  presets: [
    { id: 1, name: 'Chai ☕', cost: 15, cat: 'caffeine' },
    { id: 2, name: 'Samosa 🥟', cost: 20, cat: 'snacks' },
    { id: 3, name: 'Meals 🍲', cost: 70, cat: 'meals' },
    { id: 4, name: 'Soda 🥤', cost: 35, cat: 'drinks' },
    { id: 5, name: 'Maggi 🍜', cost: 50, cat: 'snacks' },
    { id: 6, name: 'Ice Cream 🍬', cost: 40, cat: 'sweets' }
  ],
  transactions: []
};

// --- CONSTANTS ---
const CIRCUMFERENCE = 2 * Math.PI * 92; // 578.05 px

// --- DYNAMIC DICTIONARIES ---
const CATEGORY_ICONS = {
  caffeine: '☕',
  snacks: '🥟',
  meals: '🍲',
  drinks: '🥤',
  sweets: '🍬'
};

const CATEGORY_NAMES = {
  caffeine: 'Caffeine & Focus',
  snacks: 'Quick Snacks',
  meals: 'Full Meals',
  drinks: 'Cool Drinks',
  sweets: 'Sweet Tooth'
};

// --- INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  registerServiceWorker();
  initNavigation();
  initKeypadDrawer();
  initSettingsForm();
  
  // DIRECT DASHBOARD SCAN & PAY TRIGGER
  const directScanCard = document.getElementById('directScanPayCard');
  if (directScanCard) {
    directScanCard.addEventListener('click', () => {
      state.isDirectScan = true;
      // Setup a randomized purchase in case they scan directly!
      const randomSnacks = [
        { name: 'Samosa & Chai 🥟☕', cost: 35, cat: 'snacks' },
        { name: 'Veg Burger & Soda 🍔🥤', cost: 80, cat: 'meals' },
        { name: 'Hot Maggi Bowl 🍜', cost: 50, cat: 'snacks' },
        { name: 'Cold Coffee ☕', cost: 40, cat: 'caffeine' },
        { name: 'Double Chocolate Donut 🍩', cost: 45, cat: 'sweets' }
      ];
      const choice = randomSnacks[Math.floor(Math.random() * randomSnacks.length)];
      state.currentPurchase = {
        amount: choice.cost,
        category: choice.cat,
        name: choice.name,
        note: 'Rapid Dashboard QR Scan'
      };
      
      startCameraQRScanner();
    });
  }
  
  // Initial updates
  updateDashboard();
  renderPresets();
});

// ==========================================================================
// STATE MANAGEMENT & STORAGE
// ==========================================================================

function loadStateFromStorage() {
  const savedState = localStorage.getItem('bitebudget_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error('Error loading saved state, resetting', e);
    }
  } else {
    // If no state, preload with sample data to look gorgeous out of the box
    preloadDemoData(false);
  }
}

function saveStateToStorage() {
  localStorage.setItem('bitebudget_state', JSON.stringify(state));
}

// ==========================================================================
// PWA SERVICE WORKER
// ==========================================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registered successfully!', reg.scope))
        .catch((err) => console.log('Service Worker registration failed:', err));
    });
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let emoji = 'ℹ️';
  if (type === 'success') emoji = '✅';
  if (type === 'error') emoji = '⚠️';
  
  toast.innerHTML = `<span>${emoji}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  // Slide out and remove
  setTimeout(() => {
    toast.style.animation = 'tab-fade-in 0.3s cubic-bezier(0.1, 0.8, 0.2, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

// ==========================================================================
// APP ROUTING (NAV TABS)
// ==========================================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  const views = document.querySelectorAll('.app-content .tab-view');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      // Update active states in UI
      navItems.forEach(i => i.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      item.classList.add('active');
      const activeView = document.getElementById(`tab-${targetTab}`);
      activeView.classList.add('active');
      
      // Perform screen-specific renders
      if (targetTab === 'dashboard') {
        updateDashboard();
      } else if (targetTab === 'analytics') {
        updateAnalytics();
      } else if (targetTab === 'report') {
        generateParentReport();
      } else if (targetTab === 'settings') {
        renderPresetManagerList();
      }
    });
  });

  // LEDGER "VIEW ALL" SHORTCUT LINK
  document.getElementById('viewAllLogsLink').addEventListener('click', () => {
    // Taps analytics nav button
    document.querySelector('.bottom-nav .nav-item[data-tab="analytics"]').click();
  });
}

// ==========================================================================
// TAB 1: DASHBOARD VIEWS
// ==========================================================================

function updateDashboard() {
  // Update Balance Header Card
  document.getElementById('cardBalanceValue').textContent = `${state.currency}${state.cardBalance.toFixed(2)}`;
  
  // Calculate today's spent
  const todaySpent = getTodaySpentTotal();
  const limit = state.dailyLimit;
  
  // Dial metrics
  document.getElementById('dialSpent').textContent = `${state.currency}${todaySpent.toFixed(2)}`;
  document.getElementById('dialLimit').textContent = `of ${state.currency}${limit.toFixed(2)}`;
  
  // Render Circular Progress
  const circleBar = document.querySelector('.progress-ring__bar');
  if (circleBar) {
    circleBar.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    const ratio = Math.min(1, todaySpent / limit);
    const offset = CIRCUMFERENCE - (ratio * CIRCUMFERENCE);
    circleBar.style.strokeDashoffset = offset;
  }
  
  // Motivational messages
  const motivateText = document.getElementById('dialMotivation');
  if (todaySpent === 0) {
    motivateText.textContent = "Canteen is waiting! Log your first snack 🥪";
  } else if (todaySpent < limit * 0.5) {
    motivateText.textContent = "Looking great! Well inside your budget ring. 🚀";
  } else if (todaySpent < limit) {
    motivateText.textContent = "Caution! Getting close to your daily budget limit. ⚠️";
  } else {
    motivateText.textContent = "Budget Alert! You have blown past today's limit. 🚨";
  }
  
  // Mini ledger
  renderMiniLedger();
}

function getTodaySpentTotal() {
  const todayStr = new Date().toDateString();
  return state.transactions
    .filter(t => new Date(t.timestamp).toDateString() === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);
}

function renderPresets() {
  const container = document.getElementById('presetsGrid');
  container.innerHTML = '';
  
  state.presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.setAttribute('data-cat', p.cat);
    
    // Select category emoji
    const emoji = CATEGORY_ICONS[p.cat] || '🍛';
    
    btn.innerHTML = `
      <span class="preset-icon">${emoji}</span>
      <span class="preset-name">${p.name.replace(/[^a-zA-Z\s]/g, '')}</span>
      <span class="preset-cost">${state.currency}${p.cost}</span>
    `;
    
    // Quick Add Tapping Logic
    btn.addEventListener('click', () => {
      initiatePurchase(p.cost, p.cat, p.name);
    });
    
    container.appendChild(btn);
  });
}

function renderMiniLedger() {
  const container = document.getElementById('miniLedgerList');
  container.innerHTML = '';
  
  // Get today's transactions
  const todayStr = new Date().toDateString();
  const todaysList = state.transactions
    .filter(t => new Date(t.timestamp).toDateString() === todayStr)
    .sort((a, b) => b.timestamp - a.timestamp); // newest first
    
  if (todaysList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No transactions logged today. Tap a preset above! 🥪</p>
      </div>
    `;
    return;
  }
  
  todaysList.forEach(t => {
    const item = document.createElement('div');
    item.className = 'ledger-item';
    
    const emoji = CATEGORY_ICONS[t.category] || '🍛';
    const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
      <div class="ledger-item-left">
        <div class="ledger-item-icon-box box-${t.category}">
          ${emoji}
        </div>
        <div class="ledger-item-details">
          <span class="ledger-item-title">${t.name} ${t.note ? `<span style="color:var(--text-dim);font-weight:400;font-size:11px;">(${t.note})</span>` : ''}</span>
          <span class="ledger-item-time">${timeStr}</span>
        </div>
      </div>
      <div class="ledger-item-right">
        <span class="ledger-item-cost">${state.currency}${t.amount.toFixed(2)}</span>
        <span class="ledger-item-badge badge-${t.category}">${t.category}</span>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function addTransaction(amount, category, name, note = '') {
  if (amount <= 0) {
    showToast('Please enter a valid amount!', 'error');
    return;
  }
  
  const cleanName = name || `${CATEGORY_ICONS[category] || '🍛'} Custom Log`;
  
  // Check breech status before addition
  const spentBefore = getTodaySpentTotal();
  const limit = state.dailyLimit;
  
  const newTx = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    amount: parseFloat(amount),
    category: category,
    name: cleanName,
    note: note,
    timestamp: Date.now()
  };
  
  // Update state values
  state.transactions.push(newTx);
  state.cardBalance = Math.max(0, state.cardBalance - amount); // deduct from RFID card balance
  
  // Check breech status after addition
  const spentAfter = getTodaySpentTotal();
  
  saveStateToStorage();
  updateDashboard();
  showToast(`${cleanName} logged: ${state.currency}${amount.toFixed(2)}!`, 'success');
  
  // Trigger SMS app alert drawer if breech occurred just now
  if (spentBefore <= limit && spentAfter > limit && state.smsEnabled) {
    triggerBudgetBreachSMS(spentAfter, limit);
  }
}

// ==========================================================================
// DYNAMIC CUSTOM DIAL LOGGER WIDGET
// ==========================================================================
function initKeypadDrawer() {
  const drawer = document.getElementById('loggerDrawer');
  const backdrop = document.getElementById('loggerDrawerBackdrop');
  
  const openBtn = document.getElementById('openCustomLoggerBtn');
  const closeBtn = document.getElementById('closeCustomLoggerBtn');
  
  const entryValue = document.getElementById('keypadValue');
  const keyBtns = document.querySelectorAll('.key-btn');
  const submitBtn = document.getElementById('keypadSubmitBtn');
  
  let currentVal = '0';
  
  // Set currency prefix
  document.getElementById('keypadCurrency').textContent = state.currency;
  
  // OPEN DRAWER
  openBtn.addEventListener('click', () => {
    currentVal = '0';
    entryValue.textContent = '0';
    document.getElementById('keypadNote').value = '';
    document.getElementById('keypadCurrency').textContent = state.currency;
    
    drawer.classList.add('active');
    backdrop.classList.add('active');
  });
  
  // CLOSE DRAWER
  const closeDrawer = () => {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  };
  
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  
  // KEYPAD TAPPING ACTIONS
  keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      
      // Simulate haptic click
      if (navigator.vibrate) navigator.vibrate(15);
      
      if (key === 'backspace') {
        if (currentVal.length > 1) {
          currentVal = currentVal.slice(0, -1);
        } else {
          currentVal = '0';
        }
      } else if (key === '.') {
        if (!currentVal.includes('.')) {
          currentVal += '.';
        }
      } else {
        // digit entered
        if (currentVal === '0') {
          currentVal = key;
        } else {
          // Limit length to avoid screen overflows
          if (currentVal.replace('.', '').length < 6) {
            currentVal += key;
          }
        }
      }
      
      entryValue.textContent = currentVal;
    });
  });
  
  // SUBMIT HANDLER
  submitBtn.addEventListener('click', () => {
    const finalAmount = parseFloat(currentVal);
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showToast('Enter an expense amount above 0!', 'error');
      return;
    }
    
    // Read category choice
    const selectedCat = document.querySelector('input[name="keypad-cat"]:checked').value;
    const noteText = document.getElementById('keypadNote').value.trim();
    
    // Name placeholder
    const categoryEmoji = CATEGORY_ICONS[selectedCat] || '🍛';
    const categoryName = CATEGORY_NAMES[selectedCat] || 'Food';
    const displayName = noteText ? noteText : `${categoryEmoji} Custom ${categoryName.split(' ')[1] || 'Item'}`;
    
    // Add transaction
    initiatePurchase(finalAmount, selectedCat, displayName, noteText);
    
    closeDrawer();
  });
}

// ==========================================================================
// TAB 2: ANALYTICS & VISUAL INSIGHTS
// ==========================================================================
function updateAnalytics() {
  const now = new Date();
  
  // Total Spend this month (since May 1, 2026 or current calendar month)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthList = state.transactions.filter(t => {
    const d = new Date(t.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const totalMonthSpend = monthList.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('monthTotalSpend').textContent = `${state.currency}${totalMonthSpend.toFixed(2)}`;
  
  // Most Ordered Item tally
  const counts = {};
  state.transactions.forEach(t => {
    counts[t.name] = (counts[t.name] || 0) + 1;
  });
  
  let topItem = 'None yet 🥪';
  let maxCount = 0;
  for (const name in counts) {
    if (counts[name] > maxCount) {
      maxCount = counts[name];
      topItem = name;
    }
  }
  document.getElementById('frequentItem').textContent = topItem.length > 16 ? topItem.substring(0, 16) + '...' : topItem;
  
  // Weekly total calculated
  const last7DaysList = getLast7DaysSpends();
  const weeklySum = last7DaysList.reduce((sum, d) => sum + d.amount, 0);
  document.getElementById('weeklyTotal').textContent = `7-Day Total: ${state.currency}${weeklySum.toFixed(2)}`;
  
  // Draw custom SVG bar chart
  drawWeeklyBarChart(last7DaysList);
  
  // Draw category breakdown percentage bars
  drawCategoryBreakdowns();
}

function getLast7DaysSpends() {
  const result = [];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Loop backward 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    
    const dayTotal = state.transactions
      .filter(t => new Date(t.timestamp).toDateString() === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);
      
    result.push({
      dayLabel: daysShort[d.getDay()],
      amount: dayTotal,
      isToday: i === 0
    });
  }
  return result;
}

function drawWeeklyBarChart(data) {
  const wrapper = document.getElementById('barChartWrapper');
  wrapper.innerHTML = '';
  
  const chartHeight = 140;
  const chartWidth = 320;
  const padding = 20;
  
  const maxSpend = Math.max(...data.map(d => d.amount), 50); // set minimum height scale boundary at ₹50
  
  let barElements = '';
  const numDays = data.length;
  const colWidth = (chartWidth - (padding * 2)) / numDays;
  
  data.forEach((day, index) => {
    const x = padding + (index * colWidth) + (colWidth / 6);
    const barW = colWidth * 0.65;
    
    // Scale height proportionally to fit within graph limits
    const barH = (day.amount / maxSpend) * (chartHeight - 30);
    const y = chartHeight - barH - 20;
    
    // Highlight today with neon cyan glow, others neon purple
    const color = day.isToday ? 'url(#cyanPinkGrad)' : 'url(#purpleGrad)';
    const stroke = day.isToday ? '#00f0ff' : '#9d4edd';
    
    barElements += `
      <!-- Bar Column -->
      <g>
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" 
              fill="${color}" stroke="${stroke}" stroke-width="1.5" class="chart-bar-glow" />
        
        <!-- Text Total Amount above bar -->
        ${day.amount > 0 ? `
          <text x="${x + (barW/2)}" y="${y - 6}" font-family="Outfit" font-size="9" font-weight="700" 
                fill="#ffffff" text-anchor="middle">${state.currency}${Math.round(day.amount)}</text>
        ` : ''}
        
        <!-- Day X Label -->
        <text x="${x + (barW/2)}" y="${chartHeight - 4}" font-family="Inter" font-size="10" font-weight="600" 
              fill="${day.isToday ? '#00f0ff' : '#9ba0c0'}" text-anchor="middle">${day.dayLabel}</text>
      </g>
    `;
  });
  
  const svgContent = `
    <svg width="100%" height="100%" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet" style="overflow: visible;">
      <defs>
        <!-- Gradients -->
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#9d4edd" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.15" />
        </linearGradient>
        <linearGradient id="cyanPinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ff007f" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      
      <!-- Baseline axis grid line -->
      <line x1="${padding}" y1="${chartHeight - 20}" x2="${chartWidth - padding}" y2="${chartHeight - 20}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      
      <!-- Generated Columns -->
      ${barElements}
    </svg>
  `;
  
  wrapper.innerHTML = svgContent;
}

function drawCategoryBreakdowns() {
  const container = document.getElementById('categoryBarsList');
  container.innerHTML = '';
  
  const categories = ['caffeine', 'snacks', 'meals', 'drinks', 'sweets'];
  const totals = {};
  
  // Count category totals
  let allSpendTotal = 0;
  categories.forEach(cat => {
    totals[cat] = state.transactions
      .filter(t => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    allSpendTotal += totals[cat];
  });
  
  categories.forEach(cat => {
    const spent = totals[cat] || 0;
    const pct = allSpendTotal > 0 ? (spent / allSpendTotal) * 100 : 0;
    
    const emoji = CATEGORY_ICONS[cat] || '🍛';
    const label = CATEGORY_NAMES[cat] || 'Canteen Item';
    
    const row = document.createElement('div');
    row.className = 'cat-bar-item';
    row.innerHTML = `
      <div class="cat-bar-header">
        <span class="cat-bar-label">
          <span class="cat-bar-dot" style="background-color: var(--cat-${cat}); box-shadow: 0 0 6px var(--cat-${cat})"></span>
          ${emoji} ${label}
        </span>
        <span class="cat-bar-spent">${state.currency}${spent.toFixed(2)} (${Math.round(pct)}%)</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="background-color: var(--cat-${cat}); width: 0%;"></div>
      </div>
    `;
    
    container.appendChild(row);
    
    // Micro-delayed transition to trigger animation
    setTimeout(() => {
      row.querySelector('.cat-bar-fill').style.width = `${pct}%`;
    }, 100);
  });
}

// ==========================================================================
// TAB 3: PARENT PEACE-OF-MIND SUMMARY GENERATOR
// ==========================================================================
function generateParentReport() {
  const reportBox = document.getElementById('parentReportContainer');
  const now = new Date();
  
  // Total Spent this calendar month
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();
  
  const monthList = state.transactions.filter(t => {
    const d = new Date(t.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === currentYear;
  });
  
  const monthTotal = monthList.reduce((sum, t) => sum + t.amount, 0);
  
  // Get Category distributions
  const categories = ['meals', 'caffeine', 'snacks', 'drinks', 'sweets'];
  const distribution = [];
  
  categories.forEach(cat => {
    const spent = monthList.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
    if (spent > 0) {
      const pct = monthTotal > 0 ? (spent / monthTotal) * 100 : 0;
      distribution.push({
        name: CATEGORY_NAMES[cat],
        icon: CATEGORY_ICONS[cat],
        amount: spent,
        percent: Math.round(pct)
      });
    }
  });
  
  // Average Daily Spent
  const uniqueDaysLogged = new Set(monthList.map(t => new Date(t.timestamp).toDateString())).size || 1;
  const dailyAverage = monthTotal / uniqueDaysLogged;
  
  // Write Visual DOM Card
  let listHTML = '';
  if (distribution.length === 0) {
    listHTML = `<li style="justify-content: center; color: var(--text-dim);">No transactions logged for this month yet.</li>`;
  } else {
    distribution.forEach(item => {
      listHTML += `
        <li>
          <span>${item.icon} ${item.name}</span>
          <strong>${state.currency}${item.amount.toFixed(0)} (${item.percent}%)</strong>
        </li>
      `;
    });
  }
  
  reportBox.innerHTML = `
    <h4 class="report-title">OFFICIAL CANTEEN LEDGER</h4>
    <div class="report-divider"></div>
    <p class="report-intro">Dear Mom & Dad,</p>
    <p class="report-body">
      Here is my official canteen budget summary for <strong>${currentMonth} ${currentYear}</strong>. I've logged every single bite of snack and cup of chai carefully on BiteBudget:
    </p>
    <ul class="report-stats">
      ${listHTML}
    </ul>
    <p class="report-summary">
      In total, I spent <strong>${state.currency}${monthTotal.toFixed(2)}</strong> across the canteen. My daily average spent was <strong>${state.currency}${dailyAverage.toFixed(2)}</strong>. I've stayed sensible and kept track of all my pocket money!
    </p>
    <div class="report-stamp" style="color: var(--neon-cyan); border-color: var(--neon-cyan)">VERIFIED BY BITEBUDGET</div>
  `;
  
  // COMPILE TEXT BLOCK FOR SHARING
  const compiledText = compileRawTextReport(currentMonth, currentYear, monthTotal, dailyAverage, distribution);
  
  // Bind buttons
  const copyBtn = document.getElementById('copyReportBtn');
  const whatsappBtn = document.getElementById('shareWhatsAppBtn');
  
  // Clear existing listeners
  const newCopyBtn = copyBtn.cloneNode(true);
  const newWhatsappBtn = whatsappBtn.cloneNode(true);
  copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
  whatsappBtn.parentNode.replaceChild(newWhatsappBtn, whatsappBtn);
  
  newCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(compiledText)
      .then(() => showToast('Report copied to clipboard! Share on WhatsApp. 📋', 'success'))
      .catch(() => showToast('Copy failed, please highlight text manually.', 'error'));
  });
  
  newWhatsappBtn.addEventListener('click', () => {
    const encoded = encodeURIComponent(compiledText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  });
}

function compileRawTextReport(month, year, total, dailyAvg, dist) {
  let listStr = '';
  dist.forEach(item => {
    listStr += `• ${item.icon} ${item.name}: ${state.currency}${item.amount.toFixed(0)} (${item.percent}%)\n`;
  });
  if (dist.length === 0) listStr = '• No transactions logged.\n';

  return `*📋 CANTEEN BUDGET LEDGER (${month.toUpperCase()} ${year})*

Dear Mom & Dad,

Here is my canteen spending summary. I've logged every daily counter purchase carefully on BiteBudget to keep our expenses clear:

${listStr}
*Total Canteen Spend:* ${state.currency}${total.toFixed(2)}
*Average Daily Spend:* ${state.currency}${dailyAvg.toFixed(2)}

I'm keeping my spending responsible and focusing on my studies! 🎓📚
_Logged using BiteBudget App_`;
}

// ==========================================================================
// TAB 4: SETTINGS & CUSTOM STUFF
// ==========================================================================
function initSettingsForm() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  const demoBtn = document.getElementById('loadDemoDataBtn');
  const clearBtn = document.getElementById('clearAllDataBtn');
  
  const inputLimit = document.getElementById('inputDailyLimit');
  const inputCard = document.getElementById('inputCanteenCard');
  const inputCurr = document.getElementById('inputCurrency');
  
  // SMS Alert controls
  const inputAlertName = document.getElementById('inputAlertName');
  const inputAlertPhone = document.getElementById('inputAlertPhone');
  const inputAlertBankName = document.getElementById('inputAlertBankName');
  const inputAlertBankAcct = document.getElementById('inputAlertBankAcct');
  const inputSmsTemplate = document.getElementById('inputSmsTemplate');
  const toggleSmsActive = document.getElementById('toggleSmsActive');
  
  // Populate form fields
  inputLimit.value = state.dailyLimit;
  inputCard.value = state.cardBalance;
  inputCurr.value = state.currency;
  
  // Populate SMS fields
  inputAlertName.value = state.smsRecipientName || 'Mom & Dad';
  inputAlertPhone.value = state.smsRecipient || '+91 98765 43210';
  inputAlertBankName.value = state.smsBankName || 'State Bank of India';
  inputAlertBankAcct.value = state.smsBankAccount || 'A/C **9314';
  inputSmsTemplate.value = state.smsTemplate || 'ALERT from {bank} ({acct}): {name}, I have exceeded my daily budget limit at the canteen. Spent: {spent} / Limit: {limit}.';
  toggleSmsActive.checked = state.smsEnabled !== false;
  
  // Render SMS Queue
  renderSmsHistoryList();
  
  // CURRENCY SYMBOL CHANGE UPDATES IN REALTIME
  inputCurr.addEventListener('change', () => {
    const selectedCurr = inputCurr.value;
    document.getElementById('dailyLimitPrefix').textContent = selectedCurr;
    document.getElementById('canteenCardPrefix').textContent = selectedCurr;
    document.getElementById('newPresetCurrencyPrefix').textContent = selectedCurr;
  });
  
  // SAVE FORM
  saveBtn.addEventListener('click', () => {
    const newL = parseFloat(inputLimit.value);
    const newC = parseFloat(inputCard.value);
    
    if (isNaN(newL) || newL <= 0 || isNaN(newC) || newC < 0) {
      showToast('Enter valid numerical budget values!', 'error');
      return;
    }
    
    state.dailyLimit = newL;
    state.cardBalance = newC;
    state.currency = inputCurr.value;
    
    // Save SMS settings
    state.smsRecipientName = inputAlertName.value.trim();
    state.smsRecipient = inputAlertPhone.value.trim();
    state.smsBankName = inputAlertBankName.value.trim();
    state.smsBankAccount = inputAlertBankAcct.value.trim();
    state.smsTemplate = inputSmsTemplate.value.trim();
    state.smsEnabled = toggleSmsActive.checked;
    
    saveStateToStorage();
    renderPresets(); // redraw cost currency symbols
    showToast('Budget presets & SMS rules saved!', 'success');
  });
  
  // LOAD DEMO DATA
  demoBtn.addEventListener('click', () => {
    preloadDemoData(true);
    showToast('Mock canteen transactions loaded!', 'success');
    // Navigate back to Dashboard to see results
    document.querySelector('.bottom-nav .nav-item[data-tab="dashboard"]').click();
  });
  
  // WIPE DATA
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to wipe all transaction history?')) {
      state.transactions = [];
      state.cardBalance = 450;
      state.dailyLimit = 250;
      state.currency = '₹';
      state.smsHistory = [];
      
      saveStateToStorage();
      
      // Update form
      inputLimit.value = 250;
      inputCard.value = 450;
      inputCurr.value = '₹';
      document.getElementById('dailyLimitPrefix').textContent = '₹';
      document.getElementById('canteenCardPrefix').textContent = '₹';
      
      // Reset SMS fields
      inputAlertName.value = 'Mom & Dad';
      inputAlertPhone.value = '+91 98765 43210';
      inputAlertBankName.value = 'State Bank of India';
      inputAlertBankAcct.value = 'A/C **9314';
      inputSmsTemplate.value = 'ALERT from {bank} ({acct}): {name}, I have exceeded my daily budget limit at the canteen. Spent: {spent} / Limit: {limit}.';
      toggleSmsActive.checked = true;
      
      renderPresets();
      updateDashboard();
      renderSmsHistoryList();
      showToast('All transaction logs deleted.', 'error');
    }
  });
  
  // NEW: ADD CUSTOM PRESET FORM BINDING
  const addNewPresetBtn = document.getElementById('addNewPresetBtn');
  const newPresetName = document.getElementById('newPresetName');
  const newPresetCost = document.getElementById('newPresetCost');
  const newPresetCategory = document.getElementById('newPresetCategory');
  
  // Set initial prefix symbol
  document.getElementById('newPresetCurrencyPrefix').textContent = state.currency;
  
  addNewPresetBtn.addEventListener('click', () => {
    const nameVal = newPresetName.value.trim();
    const costVal = parseFloat(newPresetCost.value);
    const catVal = newPresetCategory.value;
    
    if (!nameVal || isNaN(costVal) || costVal <= 0) {
      showToast('Please enter a valid snack name and price!', 'error');
      return;
    }
    
    // Choose category emoji
    const emoji = CATEGORY_ICONS[catVal] || '🍛';
    const displayName = `${nameVal} ${emoji}`;
    
    const newPreset = {
      id: 'custom-' + Date.now() + Math.random().toString(36).substr(2, 4),
      name: displayName,
      cost: costVal,
      cat: catVal
    };
    
    state.presets.push(newPreset);
    saveStateToStorage();
    
    // Clear inputs
    newPresetName.value = '';
    newPresetCost.value = '';
    
    // Re-render preset components
    renderPresets();
    renderPresetManagerList();
    
    showToast(`Added Canteen Snack: "${displayName}"! 🍛`, 'success');
  });
}

function renderPresetManagerList() {
  const container = document.getElementById('presetManagerList');
  container.innerHTML = '';
  
  // Update prefix inside insertion form in case it changed
  document.getElementById('newPresetCurrencyPrefix').textContent = state.currency;
  
  state.presets.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'preset-row';
    
    const emoji = CATEGORY_ICONS[p.cat] || '🍛';
    
    row.innerHTML = `
      <span class="preset-row-icon">${emoji}</span>
      <input type="text" class="preset-input-name" data-id="${p.id}" value="${p.name.replace(/[^a-zA-Z\s]/g, '').trim()}">
      <div class="preset-row-cost-box">
        <span class="preset-currency">${state.currency}</span>
        <input type="number" class="preset-input-cost" data-id="${p.id}" value="${p.cost}" min="1" max="1000">
      </div>
      <button class="preset-row-delete-btn" title="Delete Preset">🗑️</button>
    `;
    
    // Event listeners to save changes on blur / edit
    const nameInput = row.querySelector('.preset-input-name');
    const costInput = row.querySelector('.preset-input-cost');
    const deleteBtn = row.querySelector('.preset-row-delete-btn');
    
    const updatePreset = () => {
      const nameVal = nameInput.value.trim();
      const costVal = parseFloat(costInput.value);
      
      if (nameVal && !isNaN(costVal) && costVal > 0) {
        state.presets[idx].name = `${nameVal} ${emoji}`;
        state.presets[idx].cost = costVal;
        saveStateToStorage();
        renderPresets(); // refresh main list in background
      }
    };
    
    nameInput.addEventListener('blur', updatePreset);
    costInput.addEventListener('blur', updatePreset);
    
    // Quick delete handler
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete the snack preset "${p.name}"?`)) {
        state.presets = state.presets.filter(item => item.id !== p.id);
        saveStateToStorage();
        renderPresets();
        renderPresetManagerList();
        showToast(`Preset "${p.name}" deleted.`, 'error');
      }
    });
    
    container.appendChild(row);
  });
}

// ==========================================================================
// PRESET DEMO DATA POPULATION WIDGET
// ==========================================================================
function preloadDemoData(overwriteAll = false) {
  const mockTransactions = [];
  const now = new Date();
  
  const samplePurchases = [
    { name: 'Chai ☕', cost: 15, cat: 'caffeine', note: 'Study fuel' },
    { name: 'Samosa 🥟', cost: 20, cat: 'snacks', note: 'Break snack' },
    { name: 'Fried Rice 🍲', cost: 70, cat: 'meals', note: 'Lunch' },
    { name: 'Soda 🥤', cost: 35, cat: 'drinks', note: 'Thirst quench' },
    { name: 'Maggi 🍜', cost: 50, cat: 'snacks', note: 'Exam night' },
    { name: 'Chocolate 🍬', cost: 40, cat: 'sweets', note: 'Sweet craving' },
    { name: 'Coffee ☕', cost: 25, cat: 'caffeine', note: 'Morning lecture' },
    { name: 'Veg Sandwich 🍲', cost: 60, cat: 'meals', note: 'Healthy lunch' }
  ];
  
  // Fill transactions across the last 7 days
  for (let d = 7; d >= 0; d--) {
    // Generate 1 to 3 transactions per day
    const numTx = d === 0 ? 2 : Math.floor(Math.random() * 2) + 1; // today has 2 logs
    
    for (let count = 0; count < numTx; count++) {
      const mockIndex = Math.floor(Math.random() * samplePurchases.length);
      const purchase = samplePurchases[mockIndex];
      
      const txTime = new Date();
      txTime.setDate(now.getDate() - d);
      // Random hour in the day
      txTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0);
      
      mockTransactions.push({
        id: 'mock-' + d + '-' + count + '-' + Math.random().toString(36).substr(2, 4),
        amount: purchase.cost,
        category: purchase.cat,
        name: purchase.name,
        note: purchase.note,
        timestamp: txTime.getTime()
      });
    }
  }
  
  if (overwriteAll) {
    state.transactions = mockTransactions;
    state.cardBalance = 380;
  } else {
    // Merge if empty
    if (state.transactions.length === 0) {
      state.transactions = mockTransactions;
    }
  }
  
  saveStateToStorage();
}

// ==========================================================================
// NEW: BUDGET BREACH SMS TRIGGER MODAL & LEDGER
// ==========================================================================
function triggerBudgetBreachSMS(spent, limit) {
  const drawer = document.getElementById('smsAlertDrawer');
  const backdrop = document.getElementById('smsAlertBackdrop');
  
  if (!drawer || !backdrop) return;
  
  const recipientName = state.smsRecipientName || 'Mom & Dad';
  const recipientPhone = state.smsRecipient || '+91 98765 43210';
  const bankName = state.smsBankName || 'State Bank of India';
  const bankAccount = state.smsBankAccount || 'A/C **9314';
  
  let body = state.smsTemplate || 'ALERT from {bank} ({acct}): {name}, I have exceeded my daily budget limit at the canteen. Spent: {spent} / Limit: {limit}.';
  
  // Replace all available custom variables!
  body = body.replace(/{name}/g, recipientName)
             .replace(/{phone}/g, recipientPhone)
             .replace(/{bank}/g, bankName)
             .replace(/{acct}/g, bankAccount)
             .replace(/{spent}/g, `${state.currency}${spent.toFixed(2)}`)
             .replace(/{limit}/g, `${state.currency}${limit.toFixed(2)}`);
             
  // Update modal text
  document.getElementById('smsAlertDetails').textContent = `Today's canteen spend has gone above your limit of ${state.currency}${limit.toFixed(2)}.`;
  
  // Update mock SMS visual elements
  document.getElementById('smsAlertRecipientName').textContent = recipientName;
  document.getElementById('smsAlertRecipientPhone').textContent = recipientPhone;
  document.getElementById('smsAlertBankDetails').textContent = `${bankName} ${bankAccount}`;
  document.getElementById('smsAlertBody').textContent = `"${body}"`;
  
  // Push to SMS History Queue
  const smsAlert = {
    id: Date.now(),
    recipient: `${recipientName} (${recipientPhone})`,
    body: body,
    timestamp: Date.now()
  };
  
  if (!state.smsHistory) state.smsHistory = [];
  state.smsHistory.push(smsAlert);
  saveStateToStorage();
  renderSmsHistoryList();
  
  // Open modal drawer
  drawer.classList.add('active');
  backdrop.classList.add('active');
  
  // Re-bind Action button
  const actionBtn = document.getElementById('smsAlertActionBtn');
  const closeBtn = document.getElementById('smsAlertCloseBtn');
  
  const newActionBtn = actionBtn.cloneNode(true);
  actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
  
  newActionBtn.addEventListener('click', () => {
    // Open native Android SMS messenger
    const cleanPhone = recipientPhone.replace(/\s+/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
    window.open(smsUrl, '_blank');
    showToast('Opening native Android messenger pre-filled! 📲', 'success');
    
    // Close modal
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  });
  
  // Close actions
  const closeAlert = () => {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  };
  
  closeBtn.onclick = closeAlert;
  backdrop.onclick = closeAlert;
}

function renderSmsHistoryList() {
  const container = document.getElementById('smsHistoryList');
  if (!container) return;
  container.innerHTML = '';
  
  if (!state.smsHistory || state.smsHistory.length === 0) {
    container.innerHTML = `
      <div style="font-size:12px; color:var(--text-dim); text-align:center; padding:10px 0;">No SMS alerts sent yet.</div>
    `;
    return;
  }
  
  // Sort newest first, show last 5
  const list = [...state.smsHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  
  list.forEach(sms => {
    const item = document.createElement('div');
    item.className = 'sms-item';
    
    const timeStr = new Date(sms.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
      <div class="sms-item-header">
        <span>To: ${sms.recipient}</span>
        <span>${timeStr}</span>
      </div>
      <div class="sms-item-body">"${sms.body}"</div>
    `;
    container.appendChild(item);
  });
}

// ==========================================================================
// NEW: DYNAMIC SCANNING & CHOOSE PAYMENT HANDLERS
// ==========================================================================
let localStream = null;
let scanTimeout = null;

function initiatePurchase(amount, category, name, note = '') {
  state.currentPurchase = { amount, category, name, note };
  
  const drawer = document.getElementById('paymentMethodDrawer');
  const backdrop = document.getElementById('paymentMethodBackdrop');
  
  if (!drawer || !backdrop) return;
  
  // Set headers
  document.getElementById('paymentTitleName').textContent = name;
  document.getElementById('paymentTitleCost').textContent = `${state.currency}${amount.toFixed(2)}`;
  
  // Open payment method select overlay
  drawer.classList.add('active');
  backdrop.classList.add('active');
  
  // Bind buttons
  const payCardBtn = document.getElementById('payByCardBtn');
  const payScannerBtn = document.getElementById('payByScannerBtn');
  const payCancelBtn = document.getElementById('payCancelBtn');
  
  // Re-bind actions
  const newPayCardBtn = payCardBtn.cloneNode(true);
  const newPayScannerBtn = payScannerBtn.cloneNode(true);
  const newPayCancelBtn = payCancelBtn.cloneNode(true);
  
  payCardBtn.parentNode.replaceChild(newPayCardBtn, payCardBtn);
  payScannerBtn.parentNode.replaceChild(newPayScannerBtn, payScannerBtn);
  payCancelBtn.parentNode.replaceChild(newPayCancelBtn, payCancelBtn);
  
  // Card click (instant log)
  newPayCardBtn.addEventListener('click', () => {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    addTransaction(amount, category, name, note);
  });
  
  // Scanner click (triggers camera stream)
  newPayScannerBtn.addEventListener('click', () => {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    startCameraQRScanner();
  });
  
  // Cancel click
  const cancelOrder = () => {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    showToast('Canteen order cancelled.', 'error');
  };
  newPayCancelBtn.onclick = cancelOrder;
  backdrop.onclick = cancelOrder;
}

function startCameraQRScanner() {
  const drawer = document.getElementById('qrScannerDrawer');
  const backdrop = document.getElementById('qrScannerBackdrop');
  const video = document.getElementById('scannerVideo');
  const fallback = document.getElementById('scannerCameraFallback');
  
  if (!drawer || !backdrop || !video) return;
  
  // Open full-screen scanner view
  drawer.classList.add('active');
  backdrop.classList.add('active');
  
  // Reset success overlay display
  document.getElementById('scannerSuccessScreen').style.display = 'none';
  fallback.style.display = 'none';
  
  // Request native back camera feed (compatible with Android environment video)
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      localStream = stream;
      video.srcObject = stream;
      video.play();
      document.getElementById('scannerStatusText').textContent = 'Live Counter Camera';
    })
    .catch(err => {
      console.warn('Camera access unavailable or blocked: launching mock scanning feed fallback', err);
      fallback.style.display = 'flex';
      document.getElementById('scannerStatusText').textContent = 'Simulated Scan';
    });
    
  // Start simulated 2.5 second auto-detect scanner timer
  scanTimeout = setTimeout(() => {
    triggerSuccessfulScan();
  }, 2500);
  
  // Close / cancel scanner bindings
  const closeBtn = document.getElementById('closeScannerBtn');
  const mockBtn = document.getElementById('triggerMockScanBtn');
  
  const newMockBtn = mockBtn.cloneNode(true);
  mockBtn.parentNode.replaceChild(newMockBtn, mockBtn);
  
  // Close scanner callback
  const closeScanner = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    showToast('Canteen scan cancelled.', 'error');
  };
  
  closeBtn.onclick = closeScanner;
  backdrop.onclick = closeScanner;
  
  // Manual scan force click
  newMockBtn.addEventListener('click', () => {
    if (scanTimeout) clearTimeout(scanTimeout);
    triggerSuccessfulScan();
  });
}

function triggerSuccessfulScan() {
  // Stop camera stream instantly to free up camera hardware (Privacy feature!)
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Play realistic register cash beep sound completely offline using Web Audio API!
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.frequency.value = 1046.50; // high pitched sine wave C6 (the classic counter register register sound!)
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    
    osc.start();
    // exponential decay to zero
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.16);
    osc.stop(audioCtx.currentTime + 0.17);
  } catch (e) {
    console.log('Web Audio blocked or not supported on this browser context');
  }
  
  // Open green scanner checkmark overlay screen
  const successScreen = document.getElementById('scannerSuccessScreen');
  document.getElementById('scannerSuccessCost').textContent = `${state.currency}${state.currentPurchase.amount.toFixed(2)}`;
  successScreen.style.display = 'flex';
  
  // Leave receipt visible for 1.6 seconds, then log expense and close overlay
  setTimeout(() => {
    successScreen.style.display = 'none';
    
    const drawer = document.getElementById('qrScannerDrawer');
    const backdrop = document.getElementById('qrScannerBackdrop');
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    
    // Log the transaction to history
    addTransaction(
      state.currentPurchase.amount,
      state.currentPurchase.category,
      state.currentPurchase.name,
      state.currentPurchase.note
    );
    
    state.isDirectScan = false;
  }, 1600);
}
