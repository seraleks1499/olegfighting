// ui.js
// DOM interactions and rendering
window.onload = () => {
  const dom = {
    btc: document.getElementById('btc'),
    usd: document.getElementById('usd'),
    rate: document.getElementById('rate'),
    hashes: document.getElementById('hashes'),
    hpFill: document.getElementById('hpFill'),
    armorFill: document.getElementById('armorFill'),
    clickMob: document.getElementById('clickMob'),
    slots: document.getElementById('slots'),
    inventoryList: document.getElementById('inventoryList'),
    shopMenu: document.getElementById('shopMenu'),
    slotMenu: document.getElementById('slotMenu'),
    invBtn: document.getElementById('invBtn'),
    sellHashesBtn: document.getElementById('sellHashesBtn'),
    sellBTCBtn: document.getElementById('sellBTCBtn'),
    refreshRateBtn: document.getElementById('refreshRateBtn'),
    shopBtn: document.getElementById('shopBtn'),
    speedBtns: Array.from(document.querySelectorAll('.speed-buttons button'))
  };

  // Fetch and display BTC→USD rate immediately and on demand
  async function fetchRate() {
    try {
      const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      if (!res.ok) throw new Error('Не удалось получить курс');
      const data = await res.json();
      const rate = parseFloat(data.data.rates.USD);
      dom.rate.textContent = rate.toFixed(2);
    } catch (err) {
      console.error(err);
      dom.rate.textContent = '—';
    }
  }

  // Bind events
  dom.clickMob.onclick = () => handleClick();
  dom.clickMob.addEventListener('contextmenu', e => e.preventDefault());
  dom.clickMob.addEventListener('dragstart',    e => e.preventDefault());
  dom.clickMob.addEventListener('dblclick',     e => e.preventDefault());

  dom.invBtn.onclick        = () => toggleInventory();
  dom.sellHashesBtn.onclick = () => { Game.sellHashes(); updateUI(); };
  dom.sellBTCBtn.onclick    = async () => {
    try {
      const { rate, usdGain } = await Game.sellBTCForUSD();
      dom.rate.textContent = rate.toFixed(2);
      updateUI();
      alert(`Sold ${(usdGain / rate).toFixed(4)} BTC @ ${rate.toFixed(2)} → +${usdGain.toFixed(2)} USD`);
    } catch {
      alert('❌ Could not fetch rate. Try again later.');
    }
  };
  dom.refreshRateBtn.onclick = fetchRate;
  dom.shopBtn.onclick        = () => toggleShop();
  dom.speedBtns.forEach(btn => btn.onclick = () => setSpeed(btn.dataset.speed));

  // Initialize game & UI
  Game.init();
  fetchRate();
  setInterval(updateUI, 1000);
  updateUI();

  // Handle a click on the mob
  function handleClick() {
    const { damage, isCrit, ach } = Game.clickMob();
    showDamage(damage, isCrit);
    if (Math.random() < 0.2) spawnMoney(damage);
    if (ach) alert(ach.message);
    updateUI();
  }

  // Show damage popup
  function showDamage(dmg, crit) {
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    popup.textContent = crit ? `💥 -${dmg}` : `-${dmg}`;
    dom.clickMob.appendChild(popup);
    setTimeout(() => popup.remove(), 500);
  }

  // Spawn clickable money emojis
  function spawnMoney(dmg) {
    const container = document.getElementById('game');
    const gameRect = container.getBoundingClientRect();
    const mobRect  = dom.clickMob.getBoundingClientRect();
    const baseX    = mobRect.left - gameRect.left + mobRect.width/2;
    const baseY    = mobRect.top  - gameRect.top  + mobRect.height/2;

    for (let i = 0; i < 6; i++) {
      const emoji = document.createElement('div');
      emoji.className = 'money-emoji';
      emoji.textContent = '💰';
      emoji.style.left = `${baseX}px`;
      emoji.style.top  = `${baseY}px`;
      container.appendChild(emoji);

      const angle = Math.random() * 2 * Math.PI;
      const dist  = 100 + Math.random() * 50;
      requestAnimationFrame(() => {
        emoji.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
        emoji.style.opacity   = '0';
      });

      emoji.addEventListener('click', () => {
        Game.hashes += dmg * 5;
        container.removeChild(emoji);
      }, { once: true });

      setTimeout(() => {
        if (emoji.parentNode) container.removeChild(emoji);
      }, 5000);
    }
  }

  // Update all UI elements
  function updateUI() {
    dom.btc.textContent    = Game.btc.toFixed(4);
    dom.usd.textContent    = Game.usd.toFixed(2);
    dom.hashes.textContent = Game.hashes.toFixed(0);
    renderHp();
    renderSlots();
  }

  // Render mob health/armor and image
  function renderHp() {
    dom.hpFill.style.width = `${(Game.mobHp/Game.mobMaxHp)*100}%`;
    dom.hpFill.style.background = Game.mobHp/Game.mobMaxHp > 0.3 ? '#0f0' : '#999';
    dom.armorFill.style.width   = `${(Game.armorHp/Game.mobMaxHp)*100}%`;
    dom.clickMob.style.backgroundImage = `url('assets/mob${(Game.mobLevel%10)+1}.png')`;
  }

  // Render GPU slots
  function renderSlots() {
    dom.slots.innerHTML = '';
    Game.slots.forEach((gpu,i) => {
      const div = document.createElement('div');
      div.className = 'slot';
      if (gpu === 'locked') {
        div.classList.add('locked');
        div.textContent = `🔒 Slot ${i+1} ($${(i+1)*50})`;
        div.onclick = () => { Game.unlockSlot(i); updateUI(); };
      } else if (gpu === null) {
        div.textContent = `+ Insert GPU into slot ${i+1}`;
        div.onclick = () => openSlotMenu(i);
      } else {
        div.textContent = `${gpu.name} (${gpu.hashRate} h/s)`;
      }
      dom.slots.appendChild(div);
    });
  }

  // Open shop/inventory overlays
  function openSlotMenu(index) {
    dom.slotMenu.classList.remove('hidden');
    dom.slotMenu.innerHTML = '<div class="close-btn" onclick="closeSlotMenu()">×</div><h4>Select GPU:</h4>';
    Object.entries(Game.inventory).forEach(([name,count]) => {
      if (count > 0) {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = `${name} (${count})`;
        item.onclick = () => { Game.insertGPU(index,name); closeSlotMenu(); updateUI(); };
        dom.slotMenu.appendChild(item);
      }
    });
  }
  window.closeSlotMenu = () => dom.slotMenu.classList.add('hidden');

  function toggleInventory() {
    dom.inventoryList.classList.toggle('hidden');
    dom.inventoryList.innerHTML = '<div class="close-btn" onclick="toggleInventory()">×</div><h4>Inventory</h4>';
    Object.entries(Game.inventory).forEach(([name,count]) => {
      dom.inventoryList.innerHTML += `<div>${name}: ${count}</div>`;
    });
  }

  function toggleShop() {
    dom.shopMenu.classList.toggle('hidden');
    dom.shopMenu.innerHTML = '<div class="close-btn" onclick="toggleShop()">×</div><h4>🛒 Shop</h4>';

    // Click upgrade option
    const upg = document.createElement('div');
    upg.className = 'menu-item';
    upg.textContent = `Upgrade Click (+1) — $${Game.clickUpgradeCostUSD}`;
    upg.onclick = () => {
      if (Game.buyClickUpgrade()) {
        updateUI();
        alert(`Click power is now ${Game.clickPower} hashes per click.`);
      } else {
        alert('Not enough USD for click upgrade.');
      }
    };
    dom.shopMenu.appendChild(upg);

    // GPU shop items
    Game.videoCards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.textContent = `${card.name} — $${card.costUSD}`;
      item.onclick = () => { Game.buyCard(card.name); updateUI(); };
      dom.shopMenu.appendChild(item);
    });
  }

  function setSpeed(s) {
    Game.gameSpeed = Number(s);
  }

  // Export for inline onclick handlers
  window.toggleShop = toggleShop;
  window.toggleInventory = toggleInventory;
};
