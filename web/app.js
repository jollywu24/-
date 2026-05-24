const suits=['♠','♥','♣','♦'];
const ranks=[2,3,4,5,6,7,8,9,10,11,12,13,14];
const rankName={11:'J',12:'Q',13:'K',14:'A'};
const base={"High Card":[5,1],"Pair":[15,2],"Two Pair":[25,2],"Three of a Kind":[35,3],"Straight":[40,4],"Flush":[45,4],"Full House":[60,5],"Four of a Kind":[80,7],"Straight Flush":[120,10]};
const shopPool=[
  {name:'Lucky Cat',chips:0,mult:1,pair:0},
  {name:'Stone Mask',chips:10,mult:0,pair:0},
  {name:'Twin Lens',chips:0,mult:0,pair:2},
  {name:'Gold Seal',chips:5,mult:1,pair:0},
];

const state={ante:1,score:0,money:6,jokers:[],hand:[],pick:[],seed:Date.now()%100000};

function rnd(){ state.seed=(state.seed*1664525+1013904223)>>>0; return state.seed/4294967296; }
function target(){ return 60+(state.ante-1)*40; }
function deck(){ const d=[]; for(const s of suits) for(const r of ranks) d.push({r,s}); return d; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function deal(){ state.hand=shuffle(deck()).slice(0,8); state.pick=[]; }
function showCard(c){ return `${rankName[c.r]||c.r}${c.s}`; }

function evalHand(cards){
  const rs=cards.map(c=>c.r).sort((a,b)=>a-b);
  const cnt={}; rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const counts=Object.values(cnt).sort((a,b)=>b-a);
  const flush=new Set(cards.map(c=>c.s)).size===1;
  const uniq=[...new Set(rs)].sort((a,b)=>a-b);
  const straight=uniq.length===5 && (uniq[4]-uniq[0]===4 || JSON.stringify(uniq)==='[2,3,4,5,14]');
  if(straight&&flush) return 'Straight Flush';
  if(counts[0]===4) return 'Four of a Kind';
  if(JSON.stringify(counts)==='[3,2]') return 'Full House';
  if(flush) return 'Flush';
  if(straight) return 'Straight';
  if(counts[0]===3) return 'Three of a Kind';
  if(JSON.stringify(counts)==='[2,2,1]') return 'Two Pair';
  if(counts[0]===2) return 'Pair';
  return 'High Card';
}

function applyJokers(type,ch,m){
  for(const j of state.jokers){ ch+=j.chips; m+=j.mult; if(type==='Pair') m+=j.pair; }
  return [ch,m];
}

function log(t){ const el=document.getElementById('log'); el.innerHTML=`<div>${t}</div>`+el.innerHTML; }

function render(){
  document.getElementById('stats').innerHTML=`Ante: ${state.ante}/3 | 目标: ${target()} | 总分: ${state.score} | 金币: $${state.money} | Jokers: ${state.jokers.map(j=>j.name).join(', ')||'无'}`;

  const hand=document.getElementById('hand'); hand.innerHTML='';
  state.hand.forEach((c,i)=>{
    const b=document.createElement('button');
    b.className='card'+(state.pick.includes(i)?' sel':'');
    b.textContent=showCard(c);
    b.onclick=()=>togglePick(i);
    hand.appendChild(b);
  });

  document.getElementById('playBtn').disabled=state.pick.length!==5;

  const shop=document.getElementById('shop'); shop.innerHTML='';
  for(let i=0;i<3;i++){
    const j=shopPool[Math.floor(rnd()*shopPool.length)];
    const b=document.createElement('button');
    b.textContent=`${j.name} (+${j.chips}c,+${j.mult}m,pair+${j.pair})`;
    b.onclick=()=>buy(j);
    shop.appendChild(b);
  }
}

function togglePick(i){
  if(state.pick.includes(i)) state.pick=state.pick.filter(x=>x!==i);
  else if(state.pick.length<5) state.pick.push(i);
  render();
}

function buy(j){
  if(state.money<4) return log('金币不足，无法购买');
  state.money-=4;
  state.jokers.push({...j});
  log(`购买 ${j.name}`);
  render();
}

function play(){
  const chosen=state.pick.map(i=>state.hand[i]);
  const type=evalHand(chosen);
  let [ch,m]=base[type];
  [ch,m]=applyJokers(type,ch,m);
  const gain=ch*m;

  state.score+=gain;
  state.money+=5;
  log(`牌型 ${type} | chips=${ch} mult=${m} -> +${gain}`);

  if(state.score<target()){
    log('未达标，游戏失败。按 F5 重新开始');
    document.getElementById('playBtn').disabled=true;
    return;
  }

  if(state.ante===3){
    log(`通关！最终分数 ${state.score}`);
    document.getElementById('playBtn').disabled=true;
    return;
  }

  state.ante+=1;
  deal();
  render();
}

function init(){
  document.getElementById('playBtn').onclick=play;
  deal();
  render();
}

document.addEventListener('DOMContentLoaded', init);
