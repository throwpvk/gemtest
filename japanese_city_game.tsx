import React, { useRef, useEffect, useState } from 'react';
import { MessageCircle, MapPin, Package, Users, Home, Star } from 'lucide-react';

// ============================================
// ADVANCED SPATIAL GRID
// ============================================

class SpatialGrid {
  constructor(cellSize = 200) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
  
  getGridKeys(obj) {
    const startKey = Math.floor(obj.x / this.cellSize);
    const endKey = Math.floor((obj.x + (obj.width || this.cellSize)) / this.cellSize);
    return { startKey, endKey };
  }
  
  insert(obj) {
    const { startKey, endKey } = this.getGridKeys(obj);
    
    for (let key = startKey; key <= endKey; key++) {
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(obj);
    }
    
    obj._gridKeys = [];
    for (let key = startKey; key <= endKey; key++) {
      obj._gridKeys.push(key);
    }
  }
  
  remove(obj) {
    if (!obj._gridKeys) return;
    
    obj._gridKeys.forEach(key => {
      const bucket = this.grid.get(key);
      if (bucket) {
        const index = bucket.indexOf(obj);
        if (index > -1) {
          bucket.splice(index, 1);
        }
      }
    });
    
    delete obj._gridKeys;
  }
  
  update(obj) {
    this.remove(obj);
    this.insert(obj);
  }
  
  query(left, right, filterType = null) {
    const startKey = Math.floor(left / this.cellSize);
    const endKey = Math.floor(right / this.cellSize);
    const results = new Set();
    
    for (let key = startKey; key <= endKey; key++) {
      if (this.grid.has(key)) {
        this.grid.get(key).forEach(obj => {
          if (!filterType || obj.type === filterType) {
            results.add(obj);
          }
        });
      }
    }
    
    return Array.from(results);
  }
  
  queryAtPoint(x, y) {
    const key = Math.floor(x / this.cellSize);
    return this.grid.get(key) || [];
  }
  
  clear() {
    this.grid.clear();
  }
}

// ============================================
// GAME OBJECT TYPES
// ============================================

class GameObject {
  constructor(data) {
    Object.assign(this, data);
    this.id = data.id || `obj-${Date.now()}-${Math.random()}`;
  }
}

class Building extends GameObject {
  constructor(data) {
    super({
      type: 'building',
      width: 150,
      height: 400,
      interactable: true,
      ...data
    });
  }
}

class Item extends GameObject {
  constructor(data) {
    super({
      type: 'item',
      width: 40,
      height: 40,
      collectable: true,
      ...data
    });
  }
}

class Enemy extends GameObject {
  constructor(data) {
    super({
      type: 'enemy',
      width: 50,
      height: 80,
      hostile: true,
      vx: (Math.random() - 0.5) * 2,
      ...data
    });
  }
}

class NPC extends GameObject {
  constructor(data) {
    super({
      type: 'npc',
      width: 50,
      height: 90,
      interactable: true,
      vx: (Math.random() - 0.5) * 1,
      dialogKey: 'greeting',
      ...data
    });
  }
}

// ============================================
// DIALOG SYSTEM
// ============================================

const DIALOGS = {
  shop: {
    greeting: {
      jp: 'いらっしゃいませ！何かお探しですか？',
      en: 'Welcome! Are you looking for something?',
      options: [
        { id: 'a', jp: 'はい、お願いします', en: 'Yes, please', next: 'products' },
        { id: 'b', jp: '見ているだけです', en: 'Just looking', next: 'thanks' },
        { id: 'c', jp: 'また来ます', en: "I'll come back later", next: null }
      ]
    },
    products: {
      jp: '食べ物や飲み物があります。どれがいいですか？',
      en: 'We have food and drinks. Which would you like?',
      options: [
        { id: 'a', jp: '水をください', en: 'Water, please', reward: 5 },
        { id: 'b', jp: 'お菓子をください', en: 'Snacks, please', reward: 10 },
        { id: 'c', jp: '結構です', en: "I'm fine, thanks", next: null }
      ]
    },
    thanks: {
      jp: 'そうですか。ごゆっくりどうぞ！',
      en: 'I see. Take your time!',
      options: [
        { id: 'a', jp: 'ありがとうございます', en: 'Thank you', next: null }
      ]
    }
  },
  npc: {
    greeting: {
      jp: 'こんにちは！お元気ですか？',
      en: 'Hello! How are you?',
      options: [
        { id: 'a', jp: '元気です！', en: "I'm fine!", next: 'chat' },
        { id: 'b', jp: 'お疲れ様です', en: 'Nice to see you', next: 'chat' },
        { id: 'c', jp: 'さようなら', en: 'Goodbye', next: null }
      ]
    },
    chat: {
      jp: 'この街はとても綺麗ですね！',
      en: 'This city is very beautiful!',
      options: [
        { id: 'a', jp: 'そうですね', en: 'Yes, it is', reward: 5 },
        { id: 'b', jp: 'ありがとう', en: 'Thank you', next: null }
      ]
    }
  },
  restaurant: {
    greeting: {
      jp: 'いらっしゃいませ！ご注文は？',
      en: 'Welcome! What would you like to order?',
      options: [
        { id: 'a', jp: 'ラーメンをください', en: 'Ramen, please', reward: 15 },
        { id: 'b', jp: 'カレーをください', en: 'Curry, please', reward: 15 },
        { id: 'c', jp: 'まだ決めていません', en: "I haven't decided yet", next: null }
      ]
    }
  },
  school: {
    greeting: {
      jp: 'こんにちは！日本語を勉強していますか？',
      en: 'Hello! Are you studying Japanese?',
      options: [
        { id: 'a', jp: 'はい、勉強しています', en: 'Yes, I am', next: 'lesson' },
        { id: 'b', jp: 'いいえ、まだです', en: 'No, not yet', next: 'encourage' }
      ]
    },
    lesson: {
      jp: '素晴らしい！頑張ってください！',
      en: 'Wonderful! Keep it up!',
      options: [
        { id: 'a', jp: 'ありがとうございます！', en: 'Thank you!', reward: 20 }
      ]
    },
    encourage: {
      jp: '大丈夫です！一緒に始めましょう！',
      en: "That's okay! Let's start together!",
      options: [
        { id: 'a', jp: 'お願いします', en: 'Please teach me', reward: 10 }
      ]
    }
  }
};

// ============================================
// GAME ENGINE
// ============================================

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.camera = {
      x: 0,
      targetX: 0,
      smoothing: 0.1
    };
    
    this.cellWidth = 200;
    this.cellHeight = 500;
    this.totalCells = 200;
    this.worldWidth = this.cellWidth * this.totalCells;
    
    this.spatialGrid = new SpatialGrid(this.cellWidth);
    
    this.player = null;
    this.backgrounds = [];
    this.buildings = [];
    this.npcs = [];
    this.enemies = [];
    this.items = [];
    
    this.activeCollisions = new Map();
    
    this.lastTime = 0;
    this.fps = 0;
    this.running = false;
    
    this.spriteSheet = null;
    this.spriteLoaded = false;
    
    this.onCollisionStart = null;
    this.onCollisionEnd = null;
    this.onCollisionStay = null;
  }
  
  async loadSpriteSheet() {
    return new Promise((resolve) => {
      this.spriteSheet = document.createElement('canvas');
      this.spriteSheet.width = 40000;
      this.spriteSheet.height = 500;
      const ctx = this.spriteSheet.getContext('2d');
      
      for (let i = 0; i < this.totalCells; i++) {
        const hue = (i * 360 / this.totalCells) % 360;
        const isSpecial = i % 7 === 0;
        
        const gradient = ctx.createLinearGradient(i * 200, 0, i * 200, 500);
        gradient.addColorStop(0, `hsl(${hue}, 40%, ${isSpecial ? 60 : 40}%)`);
        gradient.addColorStop(1, `hsl(${hue}, 40%, ${isSpecial ? 40 : 25}%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(i * 200, 0, 200, 500);
        
        ctx.fillStyle = `hsl(${hue}, 30%, 20%)`;
        ctx.fillRect(i * 200, 450, 200, 50);
        
        if (isSpecial) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          for (let j = 0; j < 3; j++) {
            ctx.fillRect(i * 200 + 50 + j * 30, 400, 20, 50);
          }
        }
      }
      
      this.spriteLoaded = true;
      resolve();
    });
  }
  
  initWorld() {
    let currentX = 0;
    for (let i = 0; i < this.totalCells; i++) {
      const cellWidth = i % 10 === 0 ? 300 : 200;
      
      const bg = {
        id: `bg-${i}`,
        type: 'background',
        x: currentX,
        y: 0,
        width: cellWidth,
        height: this.cellHeight,
        spriteIndex: i,
        interactable: false
      };
      
      this.backgrounds.push(bg);
      currentX += cellWidth;
    }
    
    this.worldWidth = currentX;
    
    this.player = new GameObject({
      id: 'player',
      type: 'player',
      x: 400,
      y: 300,
      width: 60,
      height: 100,
      vx: 0,
      speed: 5
    });
    
    const buildingConfigs = [
      { x: 500, width: 150, buildingType: 'shop', name: 'コンビニ', dialogType: 'shop' },
      { x: 1200, width: 200, buildingType: 'restaurant', name: 'レストラン', dialogType: 'restaurant' },
      { x: 2100, width: 120, buildingType: 'house', name: '家', dialogType: 'npc' },
      { x: 3500, width: 250, buildingType: 'mall', name: 'ショッピングモール', dialogType: 'shop' },
      { x: 5000, width: 180, buildingType: 'school', name: '学校', dialogType: 'school' },
      { x: 6500, width: 150, buildingType: 'shop', name: 'スーパー', dialogType: 'shop' },
      { x: 8000, width: 200, buildingType: 'restaurant', name: '寿司屋', dialogType: 'restaurant' },
    ];
    
    buildingConfigs.forEach(config => {
      const building = new Building({
        ...config,
        y: 100,
        color: this.getBuildingColor(config.buildingType)
      });
      this.buildings.push(building);
      this.spatialGrid.insert(building);
    });
    
    for (let i = 0; i < 12; i++) {
      const npc = new NPC({
        id: `npc-${i}`,
        x: 800 + i * 600,
        y: 320,
        name: `NPC ${i + 1}`,
        color: `hsl(${i * 30}, 70%, 60%)`,
        dialogType: 'npc'
      });
      this.npcs.push(npc);
      this.spatialGrid.insert(npc);
    }
    
    for (let i = 0; i < 25; i++) {
      const item = new Item({
        id: `item-${i}`,
        x: 600 + i * 400,
        y: 380,
        itemType: i % 3 === 0 ? 'coin' : 'gem',
        color: i % 3 === 0 ? '#FFD700' : '#00CED1'
      });
      this.items.push(item);
      this.spatialGrid.insert(item);
    }
    
    for (let i = 0; i < 7; i++) {
      const enemy = new Enemy({
        id: `enemy-${i}`,
        x: 1500 + i * 1000,
        y: 320,
        color: '#FF4444'
      });
      this.enemies.push(enemy);
      this.spatialGrid.insert(enemy);
    }
  }
  
  getBuildingColor(type) {
    const colors = {
      shop: '#4A90E2',
      restaurant: '#E24A4A',
      house: '#8B7355',
      mall: '#9B59B6',
      school: '#F39C12'
    };
    return colors[type] || '#666';
  }
  
  update(deltaTime) {
    if (this.player.vx !== 0) {
      this.player.x += this.player.vx;
      this.player.x = Math.max(0, Math.min(this.worldWidth - this.player.width, this.player.x));
      
      this.camera.targetX = this.player.x - this.width / 2 + this.player.width / 2;
      this.camera.targetX = Math.max(0, Math.min(this.worldWidth - this.width, this.camera.targetX));
    }
    
    this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
    
    this.npcs.forEach(npc => {
      npc.x += npc.vx;
      if (npc.x < 0 || npc.x > this.worldWidth - npc.width) {
        npc.vx *= -1;
      }
      this.spatialGrid.update(npc);
    });
    
    this.enemies.forEach(enemy => {
      enemy.x += enemy.vx;
      if (enemy.x < 0 || enemy.x > this.worldWidth - enemy.width) {
        enemy.vx *= -1;
      }
      this.spatialGrid.update(enemy);
    });
    
    this.checkCollisions();
  }
  
  checkCollisions() {
    const viewportBuffer = 300;
    const queryLeft = this.player.x - viewportBuffer;
    const queryRight = this.player.x + this.player.width + viewportBuffer;
    
    const nearbyObjects = this.spatialGrid.query(queryLeft, queryRight);
    
    const currentCollisions = new Set();
    
    nearbyObjects.forEach(obj => {
      if (obj.id === this.player.id) return;
      
      if (this.checkAABB(this.player, obj)) {
        const collisionKey = `${this.player.id}-${obj.id}`;
        currentCollisions.add(collisionKey);
        
        if (!this.activeCollisions.has(collisionKey)) {
          this.activeCollisions.set(collisionKey, obj);
          if (this.onCollisionStart) {
            this.onCollisionStart({
              player: this.player,
              target: obj,
              targetType: obj.type
            });
          }
        } else if (this.onCollisionStay) {
          this.onCollisionStay({
            player: this.player,
            target: obj,
            targetType: obj.type
          });
        }
      }
    });
    
    this.activeCollisions.forEach((obj, key) => {
      if (!currentCollisions.has(key)) {
        if (this.onCollisionEnd) {
          this.onCollisionEnd({
            player: this.player,
            target: obj,
            targetType: obj.type
          });
        }
        this.activeCollisions.delete(key);
      }
    });
  }
  
  checkAABB(a, b) {
    return a.x < b.x + (b.width || 0) &&
           a.x + a.width > b.x &&
           a.y < b.y + (b.height || 0) &&
           a.y + a.height > b.y;
  }
  
  collectItem(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
      this.spatialGrid.remove(item);
    }
  }
  
  render() {
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    if (!this.spriteLoaded) return;
    
    this.backgrounds.forEach(bg => {
      const screenX = bg.x - this.camera.x;
      if (screenX > -bg.width && screenX < this.width) {
        this.ctx.drawImage(
          this.spriteSheet,
          bg.spriteIndex * 200, 0, 200, 500,
          screenX, 0, bg.width, bg.height
        );
      }
    });
    
    this.buildings.forEach(building => {
      const screenX = building.x - this.camera.x;
      if (screenX > -building.width && screenX < this.width + building.width) {
        this.ctx.fillStyle = building.color;
        this.ctx.fillRect(screenX, building.y, building.width, building.height);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(screenX, building.y, building.width, building.height);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.name, screenX + building.width/2, building.y + 30);
      }
    });
    
    this.items.forEach(item => {
      const screenX = item.x - this.camera.x;
      if (screenX > -100 && screenX < this.width + 100) {
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.arc(screenX + item.width/2, item.y + item.height/2, item.width/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    });
    
    this.enemies.forEach(enemy => {
      const screenX = enemy.x - this.camera.x;
      if (screenX > -100 && screenX < this.width + 100) {
        this.ctx.fillStyle = enemy.color;
        this.ctx.fillRect(screenX, enemy.y, enemy.width, enemy.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(screenX + 15, enemy.y + 20, 8, 8);
        this.ctx.fillRect(screenX + 27, enemy.y + 20, 8, 8);
      }
    });
    
    this.npcs.forEach(npc => {
      const screenX = npc.x - this.camera.x;
      if (screenX > -100 && screenX < this.width + 100) {
        this.ctx.fillStyle = npc.color;
        this.ctx.fillRect(screenX, npc.y, npc.width, npc.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(screenX + 15, npc.y + 25, 10, 10);
        this.ctx.fillRect(screenX + 25, npc.y + 25, 10, 10);
      }
    });
    
    const playerScreenX = this.player.x - this.camera.x;
    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.fillRect(playerScreenX, this.player.y, this.player.width, this.player.height);
    
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(playerScreenX + 15, this.player.y + 25, 12, 12);
    this.ctx.fillRect(playerScreenX + 33, this.player.y + 25, 12, 12);
    this.ctx.fillStyle = '#FFF';
    this.ctx.fillRect(playerScreenX + 20, this.player.y + 60, 20, 5);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 80);
    this.ctx.fillStyle = '#0F0';
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`FPS: ${this.fps}`, 20, 30);
    this.ctx.fillText(`Collisions: ${this.activeCollisions.size}`, 20, 50);
    this.ctx.fillText(`Items: ${this.items.length}`, 20, 70);
  }
  
  gameLoop(currentTime) {
    if (!this.running) return;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.fps = Math.round(1000 / deltaTime);
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  stop() {
    this.running = false;
  }
  
  movePlayer(direction) {
    this.player.vx = direction * this.player.speed;
  }
  
  stopPlayer() {
    this.player.vx = 0;
  }
}

// ============================================
// REACT COMPONENT
// ============================================

export default function JapaneseCityGame() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [collisions, setCollisions] = useState([]);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState(null);
  const [currentDialog, setCurrentDialog] = useState(null);
  const [score, setScore] = useState(0);
  const keysPressed = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    
    engine.onCollisionStart = (data) => {
      setCollisions(prev => [...prev, data]);
      
      if (data.targetType === 'item') {
        engine.collectItem(data.target);
        setScore(s => s + (data.target.itemType === 'gem' ? 10 : 5));
      }
      
      if (data.targetType === 'enemy') {
        console.log('⚠️ Enemy collision!');
      }
    };
    
    engine.onCollisionEnd = (data) => {
      setCollisions(prev => prev.filter(c => c.target.id !== data.target.id));
    };
    
    engine.loadSpriteSheet().then(() => {
      engine.initWorld();
      engine.start();
      setGameLoaded(true);
    });
    
    const handleKeyDown = (e) => {
      keysPressed.current.add(e.key);
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engine.movePlayer(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engine.movePlayer(1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        const interactable = collisions.find(c => c.target.interactable);
        if (interactable && !showDialog) {
          const dialogType = interactable.target.dialogType || 'npc';
          const dialog = DIALOGS[dialogType]?.greeting;
          if (dialog) {
            setDialogData(interactable.target);
            setCurrentDialog({ ...dialog, key: 'greeting', type: dialogType });
            setShowDialog(true);
          }
        }
      }
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key);
      
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && 
          !keysPressed.current.has('ArrowRight') && 
          !keysPressed.current.has('d') && 
          !keysPressed.current.has('D')) {
        engine.stopPlayer();
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && 
                 !keysPressed.current.has('ArrowLeft') && 
                 !keysPressed.current.has('a') && 
                 !keysPressed.current.has('A')) {
        engine.stopPlayer();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.width = canvas.width;
      engine.height = canvas.height;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      engine.stop();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [collisions, showDialog]);

  const handleDialogOption = (option) => {
    if (option.reward) {
      setScore(s => s + option.reward);
    }
    
    if (option.next) {
      const nextDialog = DIALOGS[currentDialog.type]?.[option.next];
      if (nextDialog) {
        setCurrentDialog({ ...nextDialog, key: option.next, type: currentDialog.type });
      } else {
        setShowDialog(false);
        setDialogData(null);
        setCurrentDialog(null);
      }
    } else {
      setShowDialog(false);
      setDialogData(null);
      setCurrentDialog(null);
    }
  };

  const getCollisionIcon = (type) => {
    switch(type) {
      case 'building': return <Home size={18} />;
      case 'npc': return <Users size={18} />;
      case 'item': return <Package size={18} />;
      default: return <MapPin size={18} />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {gameLoaded && (
        <>
          <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-3 rounded-lg text-sm">
            <div className="font-bold mb-2">Controls:</div>
            <div>← → or A/D: Move</div>
            <div>Enter/Space: Interact</div>
          </div>
          
          <div className="absolute top-4 right-4 bg-yellow-500/90 text-black px-6 py-3 rounded-lg font-bold text-xl flex items-center gap-2">
            <Star size={24} fill="currentColor" />
            Score: {score}
          </div>
          
          {collisions.length > 0 && (
            <div className="absolute top-24 left-4 bg-black/80 text-white p-3 rounded-lg max-w-xs">
              <div className="font-bold mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Active Collisions:
              </div>
              {collisions.map((collision, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm mb-1 bg-white/10 px-2 py-1 rounded">
                  {getCollisionIcon(collision.targetType)}
                  <span className="capitalize">{collision.targetType}</span>
                  {collision.target.name && <span>: {collision.target.name}</span>}
                  {collision.target.interactable && (
                    <span className="ml-auto text-xs bg-green-500 px-2 py-0.5 rounded">
                      Press Enter
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {collisions.some(c => c.target.interactable) && !showDialog && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce">
              <button
                onClick={() => {
                  const interactable = collisions.find(c => c.target.interactable);
                  if (interactable) {
                    const dialogType = interactable.target.dialogType || 'npc';
                    const dialog = DIALOGS[dialogType]?.greeting;
                    if (dialog) {
                      setDialogData(interactable.target);
                      setCurrentDialog({ ...dialog, key: 'greeting', type: dialogType });
                      setShowDialog(true);
                    }
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg"
              >
                <MessageCircle size={20} />
                Interact (話す)
              </button>
            </div>
          )}
          
          {showDialog && dialogData && currentDialog && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                <div className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-3">
                  {dialogData.type === 'building' && <Home size={32} />}
                  {dialogData.type === 'npc' && <Users size={32} />}
                  {dialogData.name || dialogData.buildingType}
                </div>
                
                <div className="bg-gray-100 p-6 rounded-lg mb-6">
                  <div className="text-xl mb-3 text-gray-800">
                    {currentDialog.jp}
                  </div>
                  <div className="text-gray-600">
                    {currentDialog.en}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {currentDialog.options?.map((option, idx) => (
                    <button
                      key={option.id}
                      onClick={() => handleDialogOption(option)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-all text-left flex items-center justify-between"
                    >
                      <span>
                        {String.fromCharCode(65 + idx)}) {option.jp}
                      </span>
                      {option.reward && (
                        <span className="text-yellow-300 flex items-center gap-1">
                          <Star size={16} fill="currentColor" />
                          +{option.reward}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 text-sm text-gray-500 text-center">
                  {currentDialog.options?.map((option, idx) => (
                    <div key={option.id}>
                      {String.fromCharCode(65 + idx)}) {option.en}
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    setShowDialog(false);
                    setDialogData(null);
                    setCurrentDialog(null);
                  }}
                  className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition-all"
                >
                  Close (閉じる)
                </button>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-4 right-4 bg-black/80 text-white px-4 py-3 rounded-lg text-xs">
            <div className="font-bold mb-2">Legend:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500"></div>
                <span>Player</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500"></div>
                <span>Buildings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                <span>Items (collect)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400"></div>
                <span>NPCs (talk)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400"></div>
                <span>Enemies (avoid)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}