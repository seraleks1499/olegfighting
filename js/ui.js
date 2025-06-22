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
    toggleSlotsBtn: document.getElementById('toggleSlotsBtn'),
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

  // По умолчанию показываем только первый слот
  let slotsCollapsed = true;

  // Получаем курс BTC→USD и пишем в интерфейс
  async function fetchRate() {
    try {
      const res  = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      if (!res.ok) throw new Error();
      const data = await res.json();
      dom.rate.textContent = parseFloat(data.data.rates.USD).toFixed(2);
    } catch {
      dom.rate.textContent = '—';
    }
  }

  // Рендер списка карт в инвентаре
  function renderInventoryList() {
    dom.inventoryList.innerHTML = `
      <div class="close-btn" onclick="toggleInventory()">×</div>
      <h4>📦 Инвентарь</h4>`;
    Object.entries(Game.inventory).forEach(([name, count]) => {
      const item = document.createElement('div');
      item.className   = 'menu-item';
      item.textContent = `${name}: ${count}`;
      if (count > 0) {
        const btn = document.createElement('button');
        btn.textContent = 'Продать';
        btn.onclick     = () => {
          if (Game.sellCard(name)) {
            updateUI();
            alert(`🗑️ Продана карта ${name} за $${Game.videoCards.find(c=>c.name===name).costUSD}`);
            renderInventoryList();
          } else {
            alert('Нет карт для продажи');
          }
        };
        item.appendChild(btn);
      }
      dom.inventoryList.appendChild(item);
    });
  }

  // Рендер магазина видеокарт и апгрейда клика
  function renderShopMenu() {
    dom.shopMenu.innerHTML = `
      <div class="close-btn" onclick="toggleShop()">×</div>
      <h4>🛒 Магазин</h4>`;

    // Апгрейд клика
    const upg = document.createElement('div');
    upg.className   = 'menu-item';
    upg.textContent = `Upgrade Click (+1) — $${Game.clickUpgradeCostUSD}`;
    upg.onclick     = () => {
      if (Game.buyClickUpgrade()) {
        updateUI();
        alert(`✨ Сила клика увеличена до ${Game.clickPower} хешей за клик`);
        renderShopMenu();
      } else {
        alert('Недостаточно USD для апгрейда клика');
      }
    };
    dom.shopMenu.appendChild(upg);

    // Покупка видеокарт
    Game.videoCards.forEach(card => {
      const it = document.createElement('div');
      it.className   = 'menu-item';
      it.textContent = `${card.name} — $${card.costUSD}`;
      it.onclick     = () => {
        Game.buyCard(card.name);
        updateUI();
        alert(`🛒 Куплена карта ${card.name}`);
        renderShopMenu();
      };
      dom.shopMenu.appendChild(it);
    });
  }

  // Открыть/закрыть инвентарь
  function toggleInventory() {
    dom.inventoryList.classList.toggle('hidden');
    if (!dom.inventoryList.classList.contains('hidden')) {
      renderInventoryList();
    }
  }

  // Открыть/закрыть магазин
  function toggleShop() {
    dom.shopMenu.classList.toggle('hidden');
    if (!dom.shopMenu.classList.contains('hidden')) {
      renderShopMenu();
    }
  }

  // Привязка событий
  dom.clickMob.onclick               = () => handleClick();
  dom.clickMob.addEventListener('contextmenu', e => e.preventDefault());
  dom.clickMob.addEventListener('dragstart',     e => e.preventDefault());
  dom.clickMob.addEventListener('dblclick',      e => e.preventDefault());

  dom.invBtn.onclick                 = () => toggleInventory();
  dom.sellHashesBtn.onclick          = () => { Game.sellHashes(); updateUI(); };
  dom.sellBTCBtn.onclick             = async () => {
    try {
      const { rate, usdGain } = await Game.sellBTCForUSD();
      dom.rate.textContent      = rate.toFixed(2);
      updateUI();
      alert(`💲 Продано ${(usdGain/rate).toFixed(4)} BTC @ ${rate.toFixed(2)} → +${usdGain.toFixed(2)} USD`);
    } catch {
      alert('❌ Не удалось получить курс');
    }
  };
  dom.refreshRateBtn.onclick         = fetchRate;
  dom.toggleSlotsBtn.onclick         = () => {
    slotsCollapsed = !slotsCollapsed;
    dom.toggleSlotsBtn.textContent = slotsCollapsed ? '+ Развернуть' : '- Свернуть';
    updateUI();
  };
  dom.shopBtn.onclick                = () => toggleShop();
  dom.speedBtns.forEach(btn => btn.onclick = () => setSpeed(btn.dataset.speed));

  // Инициализация
  Game.init();
  fetchRate();
  setInterval(updateUI, 1000);
  updateUI();

  // Обработка клика по мобу
  function handleClick() {
    const { damage, isCrit, ach } = Game.clickMob();
    showDamage(damage, isCrit);
    if (Math.random() < 0.2) spawnMoney(damage);
    if (ach) alert(ach.message);
    updateUI();
  }

  // Показ урона
  function showDamage(dmg, crit) {
    const pop = document.createElement('div');
    pop.className   = 'damage-popup';
    pop.textContent = crit ? `💥 -${dmg}` : `-${dmg}`;
    dom.clickMob.appendChild(pop);
    setTimeout(() => pop.remove(), 500);
  }

  // Летающие эмоджи денег
  function spawnMoney(dmg) {
    const cont = document.getElementById('game');
    const gR   = cont.getBoundingClientRect();
    const mR   = dom.clickMob.getBoundingClientRect();
    const x0   = mR.left - gR.left + mR.width/2;
    const y0   = mR.top  - gR.top  + mR.height/2;

    for (let i = 0; i < 6; i++) {
      const e = document.createElement('div');
      e.className   = 'money-emoji';
      e.textContent = '💰';
      e.style.left  = `${x0}px`;
      e.style.top   = `${y0}px`;
      cont.appendChild(e);

      const angle = Math.random() * 2 * Math.PI;
      const dist  = 100 + Math.random() * 50;
      requestAnimationFrame(() => {
        e.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
        e.style.opacity   = '0';
      });

      e.addEventListener('click', () => {
        Game.hashes += dmg * 5;
        cont.removeChild(e);
      }, { once: true });

      setTimeout(() => { if (e.parentNode) cont.removeChild(e); }, 5000);
    }
  }

  // Обновление всего UI
  function updateUI() {
    dom.btc.textContent    = Game.btc.toFixed(4);
    dom.usd.textContent    = Game.usd.toFixed(2);
    dom.hashes.textContent = Game.hashes.toFixed(0);
    renderHp();
    renderSlots();
  }

  // Отрисовка HP и брони
  function renderHp() {
    dom.hpFill.style.width      = `${(Game.mobHp/Game.mobMaxHp)*100}%`;
    dom.hpFill.style.background = Game.mobHp/Game.mobMaxHp > 0.3 ? '#0f0' : '#999';
    dom.armorFill.style.width   = `${(Game.armorHp/Game.mobMaxHp)*100}%`;
    dom.clickMob.style.backgroundImage = `url('assets/mob${(Game.mobLevel%10)+1}.png')`;
  }

  // Отрисовка слотов с учётом свёрнутости
  function renderSlots() {
    dom.slots.innerHTML = '';
    const toShow = slotsCollapsed ? [0] : Game.slots.map((_,i) => i);
    toShow.forEach(i => {
      const gpu = Game.slots[i];
      const div = document.createElement('div');
      div.className = 'slot';
      if (gpu === 'locked') {
        div.classList.add('locked');
        div.textContent = `🔒 Slot ${i+1} ($${(i+1)*50})`;
        div.onclick     = () => { Game.unlockSlot(i); updateUI(); };
      } else {
        div.textContent = gpu
          ? `${gpu.name} (${gpu.hashRate} h/s)`
          : `+ Insert GPU into slot ${i+1}`;
        div.onclick     = () => openSlotMenu(i);
      }
      dom.slots.appendChild(div);
    });
  }

  // Меню слота: удалить/заменить или вставить GPU
  function openSlotMenu(index) {
    dom.slotMenu.classList.remove('hidden');
    dom.slotMenu.innerHTML = `
      <div class="close-btn" onclick="closeSlotMenu()">×</div>
      <h4>Выберите видеокарту:</h4>`;
    // Удаление существующей карты
    if (Game.slots[index]) {
      const rm = document.createElement('div');
      rm.className   = 'menu-item';
      rm.textContent = 'Удалить карту из слота';
      rm.onclick     = () => { Game.removeGPU(index); closeSlotMenu(); updateUI(); };
      dom.slotMenu.appendChild(rm);
    }
    // Список карт из инвентаря
    Object.entries(Game.inventory).forEach(([name,count]) => {
      if (count > 0) {
        const item = document.createElement('div');
        item.className   = 'menu-item';
        item.textContent = `${name} (${count})`;
        item.onclick     = () => { Game.insertGPU(index,name); closeSlotMenu(); updateUI(); };
        dom.slotMenu.appendChild(item);
      }
    });
  }
  window.closeSlotMenu = () => dom.slotMenu.classList.add('hidden');

  // Экспорт для inline onclick
  window.toggleShop      = toggleShop;
  window.toggleInventory = toggleInventory;
};
