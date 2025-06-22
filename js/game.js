// game.js
// Core game state and logic
const Game = {
  // Balances and stats
  hashes: 0,                // accumulated hashes
  btc: 0,                   // balance in BTC
  usd: 0,                   // balance in USD
  gameSpeed: 1,             // passive mining speed multiplier

  // Click upgrade parameters
  clickPower: 1,            // hashes per click
  clickUpgradeCostUSD: 50,  // initial cost of click upgrade

  // Hashes to BTC conversion
  hashesPerBTC: 1000000,    // how many hashes for 1 BTC

  // Mob info
  mobLevel: 1,
  mobHp: 0,
  mobMaxHp: 0,
  armorHp: 0,

  // Click data & achievements
  clickCount: 0,
  achievements: {
    clicks100: false,
    firstGPU: false,
    btc1: false
  },

  // Video card definitions, cost in USD
  videoCards: [
    { name: 'GTX 1050', hashRate: 1, costUSD: 10 },
    { name: 'GTX 1660', hashRate: 3, costUSD: 25 },
    { name: 'RTX 3060', hashRate: 7, costUSD: 75 },
    { name: 'RTX 3090', hashRate: 15, costUSD: 150 },
    { name: 'ASIC Miner', hashRate: 50, costUSD: 500 }
  ],

  // Inventory: number of each card
  inventory: {
    'GTX 1050': 1,
    'GTX 1660': 0,
    'RTX 3060': 0,
    'RTX 3090': 0,
    'ASIC Miner': 0
  },

  // Slots: null = empty, 'locked', or card object
  slots: [ null, 'locked', 'locked', 'locked' ],

  // Initialize game
  init() {
    this.updateMob();
    setInterval(() => this.mine(), 1000);
  },

  // Set up a new mob
  updateMob() {
    this.mobMaxHp = 25 + this.mobLevel * 10;
    this.mobHp = this.mobMaxHp;
    this.armorHp = Math.random() < 0.2
      ? Math.floor(this.mobMaxHp * 0.5)
      : 0;
  },

  // Handle click on mob, return {damage, isCrit, ach}
  clickMob() {
    this.clickCount++;
    const isCrit = Math.random() < 0.1;
    const damage = isCrit
      ? this.clickPower * 5
      : this.clickPower;

    if (this.armorHp > 0) {
      this.armorHp -= damage;
      if (this.armorHp < 0) {
        this.mobHp += this.armorHp;
        this.armorHp = 0;
      }
    } else {
      this.mobHp -= damage;
    }

    this.hashes += damage;

    if (this.mobHp <= 0) {
      this.mobLevel++;
      this.updateMob();
    }

    return { damage, isCrit, ach: this.checkAchievements() };
  },

  // Passive mining from GPUs
  mine() {
    this.slots.forEach(card => {
      if (card && card.hashRate) {
        this.hashes += card.hashRate * this.gameSpeed;
      }
    });
  },

  // Sell hashes for BTC by hashesPerBTC
  sellHashes() {
    const btcGain = this.hashes / this.hashesPerBTC;
    this.btc += btcGain;
    this.hashes = 0;
    this.checkAchievements();
  },

  // Async sell all BTC to USD via Coinbase API
  async sellBTCForUSD() {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
    if (!res.ok) throw new Error('Failed to fetch rate');
    const data = await res.json();
    const rate = parseFloat(data.data.rates.USD);
    const usdGain = this.btc * rate;
    this.usd += usdGain;
    this.btc = 0;
    this.checkAchievements();
    return { rate, usdGain };
  },

  // Buy GPU with USD
  buyCard(cardName) {
    const card = this.videoCards.find(c => c.name === cardName);
    if (this.usd >= card.costUSD) {
      this.usd -= card.costUSD;
      this.inventory[card.name]++;
      this.checkAchievements();
    }
  },

  // Unlock slot with USD
  unlockSlot(index) {
    const costUSD = (index + 1) * 50;
    if (this.usd >= costUSD) {
      this.usd -= costUSD;
      this.slots[index] = null;
    }
  },

  // Insert or replace GPU in slot
  insertGPU(index, name) {
    const card = this.videoCards.find(c => c.name === name);
    const existing = this.slots[index];
    if (existing && existing.name) {
      this.inventory[existing.name]++;
    }
    this.slots[index] = card;
    this.inventory[name]--;
    this.achievements.firstGPU = true;
  },

  // Remove GPU from slot back to inventory
  removeGPU(index) {
    const existing = this.slots[index];
    if (existing && existing.name) {
      this.inventory[existing.name]++;
      this.slots[index] = null;
    }
  },

  // Sell a GPU from inventory for USD
  sellCard(cardName) {
    const card = this.videoCards.find(c => c.name === cardName);
    if (this.inventory[cardName] > 0) {
      this.inventory[cardName]--;
      this.usd += card.costUSD;
      return true;
    }
    return false;
  },

  // Buy click upgrade (+1 clickPower)
  buyClickUpgrade() {
    if (this.usd >= this.clickUpgradeCostUSD) {
      this.usd -= this.clickUpgradeCostUSD;
      this.clickPower++;
      this.clickUpgradeCostUSD = Math.ceil(this.clickUpgradeCostUSD * 1.5);
      return true;
    }
    return false;
  },

  // Check achievements
  checkAchievements() {
    if (this.clickCount >= 100 && !this.achievements.clicks100) {
      this.achievements.clicks100 = true;
      return { type: 'alert', message: '🏆 Achievement: 100 clicks!' };
    }
    if (this.btc >= 1 && !this.achievements.btc1) {
      this.achievements.btc1 = true;
      return { type: 'alert', message: '🏆 Achievement: 1 BTC!' };
    }
    return null;
  }
};