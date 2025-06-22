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

  // Fetch and display BTC→USD rate
  async function fetchRate() {
    try {
      const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      if (!res.ok) throw new Error('Failed to fetch rate');
      const data = await res.json();
      const rate = parseFloat(data.data.rates.USD);
      dom.rate.textContent = rate.toFixed(2);
    } catch {
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
      alert('❌ Could not fetch rate');
    }
  };
  dom.refreshRateBtn.onclick = fetchRate;
  dom.shopBtn.onclick        = () => toggleShop();
  dom.speedBtns.forEach(btn => btn.onclick = () => setSpeed(btn.dataset.speed));

  // Init
  Game.init();
  fetchRate();
  setInterval(updateUI, 1000);
  updateUI();

  function handleClick() {
    const { damage, isCrit, ach } = Game.clickMob();
    showDamage(damage, isCrit);
    if (Math.random() < 0.2) spawnMoney(damage);
    if (ach) alert(ach.message);
    updateUI();
  }

  function showDamage(dmg, crit) {
    const pop = document.createElement('div');
    pop.className = 'damage-popup';
    pop.textContent = crit ? `💥 -${dmg}` : `-${dmg}`;
    dom.clickMob.appendChild(pop);
    setTimeout(() => pop.remove(), 500);
  }

  function spawnMoney(dmg) {
    const cont = document.getElementById('game');
    const gR = cont.getBoundingClientRect();
    const mR = dom.clickMob.getBoundingClientRect();
    const x0 = mR.left - gR.left + mR.width/2;
    const y0 = mR.top  - gR.top  + mR.height/2;
    for (let i=0; i<6; i++){
      const e = document.createElement('div');
      e.className='money-emoji'; e.textContent='💰';
      e.style.left=`${x0}px`; e.style.top=`${y0}px`;
      cont.appendChild(e);
      const a=Math.random()*2*Math.PI, d=100+Math.random()*50;
      requestAnimationFrame(()=>{
        e.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`;
        e.style.opacity='0';
      });
      e.addEventListener('click',()=>{
        Game.hashes += dmg*5;
        cont.removeChild(e);
      },{once:true});
      setTimeout(()=>{ if(e.parentNode) cont.removeChild(e); },5000);
    }
  }

  function updateUI(){
    dom.btc.textContent    = Game.btc.toFixed(4);
    dom.usd.textContent    = Game.usd.toFixed(2);
    dom.hashes.textContent = Game.hashes.toFixed(0);
    renderHp(); renderSlots();
  }

  function renderHp(){
    dom.hpFill.style.width   = `${(Game.mobHp/Game.mobMaxHp)*100}%`;
    dom.hpFill.style.background = Game.mobHp/Game.mobMaxHp>0.3?'#0f0':'#999';
    dom.armorFill.style.width   = `${(Game.armorHp/Game.mobMaxHp)*100}%`;
    dom.clickMob.style.backgroundImage = `url('assets/mob${(Game.mobLevel%10)+1}.png')`;
  }

  function renderSlots(){
    dom.slots.innerHTML='';
    Game.slots.forEach((gpu,i)=>{
      const div=document.createElement('div');
      div.className='slot';
      if(gpu==='locked'){
        div.classList.add('locked');
        div.textContent=`🔒 Slot ${i+1} ($${(i+1)*50})`;
        div.onclick=()=>{ Game.unlockSlot(i); updateUI(); };
      } else {
        // и пустой, и заполненный слот обрабатываем одинаково
        if(gpu===null){
          div.textContent=`+ Insert GPU into slot ${i+1}`;
        } else {
          div.textContent=`${gpu.name} (${gpu.hashRate} h/s)`;
        }
        // клик по любому незаблокированному слоту открывает меню
        div.onclick=()=>openSlotMenu(i);
      }
      dom.slots.appendChild(div);
    });
  }


  function openSlotMenu(index){
    dom.slotMenu.classList.remove('hidden');
    dom.slotMenu.innerHTML = '<div class="close-btn" onclick="closeSlotMenu()">×</div><h4>Выберите видеокарту:</h4>';
    if(Game.slots[index]){
      const rm=document.createElement('div');
      rm.className='menu-item'; rm.textContent='Удалить карту из слота';
      rm.onclick=()=>{Game.removeGPU(index); closeSlotMenu(); updateUI();};
      dom.slotMenu.appendChild(rm);
    }
    Object.entries(Game.inventory).forEach(([name,count])=>{
      if(count>0){
        const it=document.createElement('div');
        it.className='menu-item'; it.textContent=`${name} (${count})`;
        it.onclick=()=>{Game.insertGPU(index,name); closeSlotMenu(); updateUI();};
        dom.slotMenu.appendChild(it);
      }
    });
  }
  window.closeSlotMenu = ()=>dom.slotMenu.classList.add('hidden');

  function toggleInventory(){
    dom.inventoryList.classList.toggle('hidden');
    dom.inventoryList.innerHTML = '<div class="close-btn" onclick="toggleInventory()">×</div><h4>📦 Инвентарь</h4>';
    Object.entries(Game.inventory).forEach(([name,count])=>{
      const it=document.createElement('div'); it.className='menu-item';
      it.textContent=`${name}: ${count}`;
      if(count>0){
        const b=document.createElement('button'); b.textContent='Продать';
        b.onclick=()=>{
          if(Game.sellCard(name)){
            updateUI(); alert(`Продана карта ${name} за $${Game.videoCards.find(c=>c.name===name).costUSD}`);
          } else alert('Нет карт');
        };
        it.appendChild(b);
      }
      dom.inventoryList.appendChild(it);
    });
  }

  function toggleShop(){
    dom.shopMenu.classList.toggle('hidden');
    dom.shopMenu.innerHTML = '<div class="close-btn" onclick="toggleShop()">×</div><h4>🛒 Shop</h4>';
    const upg=document.createElement('div');
    upg.className='menu-item';
    upg.textContent=`Upgrade Click (+1) — $${Game.clickUpgradeCostUSD}`;
    upg.onclick=()=>{
      if(Game.buyClickUpgrade()){
        updateUI(); alert(`Click power: ${Game.clickPower}`);
      } else alert('Недостаточно USD');
    };
    dom.shopMenu.appendChild(upg);
    Game.videoCards.forEach(card=>{
      const it=document.createElement('div');
      it.className='menu-item'; it.textContent=`${card.name} — $${card.costUSD}`;
      it.onclick=()=>{ Game.buyCard(card.name); updateUI(); };
      dom.shopMenu.appendChild(it);
    });
  }

  function setSpeed(s){ Game.gameSpeed = Number(s); }

  window.toggleShop = toggleShop;
  window.toggleInventory = toggleInventory;
};