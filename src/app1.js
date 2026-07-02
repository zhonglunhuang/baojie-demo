/* ================= 常數 ================= */
const WARRANTY_YEARS = 2;      // 保固年限（Demo 預設 2 年）
const INSPECT_FEE = 300;       // 過保送檢費+檢測費
const SHIP_FEE = 200;          // 寄件運費

const OFFICES = {
  north:  { name: '北部維修部門／辦事處', addr: '台北市內湖區瑞光路 123 號 5 樓' },
  central:{ name: '中部辦事處',           addr: '台中市西屯區台灣大道二段 456 號' },
  south:  { name: '南部辦事處',           addr: '高雄市前鎮區中山二路 789 號' },
};
const WH_LABEL = { north:'北部', central:'中部', south:'南部' };
const WHS = ['north','central','south'];

const ROLES = {
  customer:'客戶', sales:'業務', receiver:'收件/點收人員',
  tech:'維修人員', stock:'控存人員', finance:'核帳/財務人員',
};
const ROLE_TABS = {
  customer:['repairNew','shop','orders','notifs'],
  sales:   ['repairNew','shop','orders','notifs'],
  receiver:['receive','handover','overview','notifs'],
  tech:    ['work','handover','overview','notifs'],
  stock:   ['inv','review','pricing','txns','overview','notifs'],
  finance: ['recon','overview','notifs'],
};
const TAB_LABELS = {
  repairNew:'維修申請', shop:'配件商城', orders:'我的訂單', notifs:'通知',
  receive:'收件點收', handover:'取件／寄送作業', overview:'流程總覽',
  work:'維修工作台', inv:'庫存管理', review:'收單／預購審查',
  pricing:'價目表維護', txns:'異動記錄', recon:'對帳作業',
};

const PERSONA = {
  customer:{ name:'王小明', phone:'0912-345-678', addr:'台北市大安區和平東路一段 100 號' },
  sales:   { name:'李佳玲（業務）', phone:'0987-654-321', addr:'台中市北區進化路 50 號' },
};

/* 全局價目表主資料：biz=業務價 cust=客戶價 null=待補 / bizOnly=業務專用 */
const CATALOG = [
  { id:'p1',  name:'圓刷',              biz:950,   cust:950,   repair:true, sale:true },
  { id:'p2',  name:'地板刷',            biz:950,   cust:950,   repair:true, sale:true },
  { id:'p3',  name:'機器濾網',          biz:300,   cust:450,   repair:true, sale:true },
  { id:'p4',  name:'T型刷',             biz:350,   cust:350,   repair:true, sale:true },
  { id:'p5',  name:'遙控器',            biz:2700,  cust:2700,  repair:true, sale:true },
  { id:'p6',  name:'噴氣頭',            biz:250,   cust:250,   repair:true, sale:true },
  { id:'p7',  name:'細縫刷',            biz:500,   cust:500,   repair:true, sale:true },
  { id:'p8',  name:'機器背蓋',          biz:500,   cust:900,   repair:true },
  { id:'p9',  name:'機器水盆',          biz:3000,  cust:3000,  repair:true },
  { id:'p10', name:'主機刷子',          biz:250,   cust:250,   repair:true },
  { id:'p11', name:'拍打頭接觸線',      biz:1200,  cust:1200,  repair:true },
  { id:'p12', name:'大噴瓶',            biz:400,   cust:400,   repair:true, sale:true },
  { id:'p13', name:'帶電軟管(不含遙控器)', biz:9000, cust:9000, repair:true, note:'二手價 $6,300' },
  { id:'p14', name:'帶電軟管(含遙控器)',  biz:12000, cust:12000, repair:true },
  { id:'p15', name:'捲線器',            biz:1800,  cust:1800,  repair:true },
  { id:'p16', name:'附輪底座',          biz:null,  cust:null,  repair:true, tbd:true },
  { id:'p17', name:'鋼管(一支)',        biz:null,  cust:null,  repair:true, tbd:true },
  { id:'p20', name:'觸控面板',          biz:null,  cust:null,  repair:true, tbd:true },
  { id:'p21', name:'膠條',              biz:null,  cust:null,  repair:true, tbd:true },
  { id:'p22', name:'原廠消毒水',        biz:350,   cust:400,   sale:true },
  { id:'p23', name:'制服',              biz:600,   cust:null,  sale:true, bizOnly:true },
  { id:'p24', name:'手電筒',            biz:350,   cust:null,  sale:true, bizOnly:true },
  { id:'p25', name:'紙本單',            biz:500,   cust:null,  sale:true, bizOnly:true },
  { id:'p26', name:'寵物包',            biz:1800,  cust:null,  sale:true, bizOnly:true },
  { id:'p27', name:'雨罩',              biz:200,   cust:null,  sale:true, bizOnly:true },
  { id:'p28', name:'萊潔消毒水',        biz:170,   cust:null,  sale:true, bizOnly:true },
  { id:'p29', name:'名片',              biz:340,   cust:null,  sale:true, bizOnly:true },
];

/* 階段1 維修項目勾選清單（主機/拍打頭需填型號） */
const REPAIR_ITEMS = ['主機','拍打頭','圓刷','地板刷','機器濾網','T型刷','遙控器','噴氣頭','細縫刷',
  '機器背蓋','機器水盆','主機刷子','拍打頭接觸線','大噴瓶','帶電軟管(不含遙控器)','帶電軟管(含遙控器)',
  '捲線器','附輪底座','鋼管(一支)','觸控面板','膠條'];

const RSTATUS = {
  submitted: ['待收件','b-blue'],   received: ['維修檢測中','b-purple'],
  quoted:    ['已報價待回覆','b-amber'], paid: ['待對帳','b-purple'],
  reconciled:['待取件／寄送','b-teal'],  closed: ['已結案','b-green'],
};
const SSTATUS = {
  pending_payment:['待付款','b-amber'], pending_recon:['待對帳','b-purple'],
  pending_stock: ['待收單備貨','b-blue'], ready:['備貨完成','b-teal'], closed:['已結案','b-green'],
};
const RSTEPS = ['申請送件','收件點收','檢測維修','發送報價','付款/取件方式','對帳結案'];
const SSTEPS = ['線上下單','完成付款','對帳確認','收單備貨','完成'];
const RDONE = { submitted:1, received:2, quoted:4, paid:5, reconciled:5, closed:6 };
const SDONE = { pending_payment:1, pending_recon:2, pending_stock:3, ready:4, closed:5 };
const R_ACTOR = { submitted:'收件/點收人員', received:'維修人員', quoted:'客戶/業務',
  paid:'核帳/財務人員', reconciled:'點收/維修人員', closed:'—' };
const S_ACTOR = { pending_payment:'客戶/業務', pending_recon:'核帳/財務人員',
  pending_stock:'控存人員', ready:'控存人員(結案)', closed:'—' };

const UNI_STYLES = ['舊款男版','舊款女版','備用版圓領T','新版通用版'];
const UNI_SIZES  = ['XS','S','M','L','XL','2XL','3XL'];

/* ================= 狀態 ================= */
const LS_KEY = 'baojie_demo_v1';
let state = null;
let cart = []; // 購物車（不落地）

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function load(){
  try{ const s = localStorage.getItem(LS_KEY); if(s){ state = JSON.parse(s); return true; } }catch(e){}
  return false;
}
function resetDemo(){
  if(!confirm('確定要清除所有操作、恢復示範初始資料？')) return;
  localStorage.removeItem(LS_KEY); location.reload();
}

/* ================= 工具 ================= */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(n){ return '$' + Number(n||0).toLocaleString(); }
function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function todayISO(){ return iso(new Date()); }
function addMonths(d, m){ const x = new Date(d); x.setMonth(x.getMonth()+m); return x; }
function fmtDate(s){ return s ? s.replace(/-/g,'/') : '—'; }
function fmtDT(ts){ const d = new Date(ts); return iso(d).replace(/-/g,'/') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
function toast(msg){ const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2600); }

function warranty(shipDate){
  if(!shipDate) return null;
  const end = new Date(shipDate); end.setFullYear(end.getFullYear() + WARRANTY_YEARS);
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.floor((now - end) / 86400000);
  return { inW: diff <= 0, end: iso(end), overdue: diff > 0 ? diff : 0 };
}
function wBadge(w){
  if(!w) return '<span class="badge b-gray">未填出貨日期</span>';
  return w.inW
    ? `<span class="badge b-green">🟢 保固內（至 ${fmtDate(w.end)}）</span>`
    : `<span class="badge b-red">🔴 已過保（過期 ${w.overdue} 天）</span>`;
}
function cat(id){ return CATALOG.find(c=>c.id===id); }
function kindOf(role){ return role==='sales' ? 'biz' : 'cust'; }
function price(id, kind){ const p = state.pricing[id]; return p ? p[kind] : null; }

function partTotals(id){
  const e = state.inv.parts[id]; if(!e) return {q:0,s:0};
  let q=0,s=0; WHS.forEach(w=>{ q+=e[w].q; s+=e[w].s; });
  return {q,s};
}
function frontStatus(id){ const t = partTotals(id); return t.q > t.s ? '現貨' : '預購'; }
function fsBadge(id){ return frontStatus(id)==='現貨' ? '<span class="badge b-green">現貨</span>' : '<span class="badge b-amber">預購</span>'; }

/* ================= 通知 ================= */
function notify(roles, title, body, ref){
  state.notifs.unshift({ id:'n'+(++state.seq.n), ts:Date.now(), roles, title, body, ref:ref||null, read:false });
}
function unreadCount(){ return state.notifs.filter(n=>n.roles.includes(state.role) && !n.read).length; }
function openRef(ref){
  if(!ref) return;
  if(ref[0]==='R' && state.repairs.find(r=>r.id===ref)) openRepair(ref);
  else if(ref[0]==='S' && state.sales.find(s=>s.id===ref)) openSale(ref);
}

/* ================= 庫存異動核心 ================= */
function logTxn(type, item, wh, delta, staff, ref, note){
  state.txns.unshift({ ts:Date.now(), type, item, wh, delta, staff:staff||'—', ref:ref||'', note:note||'' });
}
function adjustPart(id, wh, delta, type, staff, ref, note){
  const before = frontStatus(id);
  state.inv.parts[id][wh].q += delta;
  logTxn(type, cat(id).name, WH_LABEL[wh], delta, staff, ref, note);
  const after = frontStatus(id);
  if(before==='現貨' && after==='預購'){
    notify(['stock'], '⚠️ 低庫存提醒', `「${cat(id).name}」合計庫存已低於安全庫存量，前台已自動切換為「預購」，請安排補貨或調撥。`, null);
  }
}
