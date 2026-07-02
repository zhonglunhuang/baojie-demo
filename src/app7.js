/* ============== 條碼工具（EAN-13） ============== */
function ean13(base12){
  const d = base12.split('').map(Number);
  let s = 0; d.forEach((n,i)=>{ s += n * (i%2 ? 3 : 1); });
  return base12 + ((10 - s%10) % 10);
}
function codeForIndex(i){ return ean13('47100000' + String(i).padStart(4,'0')); }
function barcodeOf(id){
  for(const [c,v] of Object.entries(state.barcodes)) if(v===id) return c;
  return null;
}
function ean13Svg(code){
  const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const R = L.map(x=>x.split('').map(b=>b==='1'?'0':'1').join(''));
  const G = R.map(x=>x.split('').reverse().join(''));
  const P = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  const d = code.split('').map(Number);
  let m = '101';
  for(let i=1;i<=6;i++) m += (P[d[0]][i-1]==='L' ? L : G)[d[i]];
  m += '01010';
  for(let i=7;i<=12;i++) m += R[d[i]];
  m += '101';
  const w = 2, h = 56;
  let rects = '', x = 10;
  for(const bit of m){ if(bit==='1') rects += `<rect x="${x*w}" y="0" width="${w}" height="${h}"/>`; x++; }
  const W = (95+20)*w;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h+16}" viewBox="0 0 ${W} ${h+16}"><rect width="${W}" height="${h+16}" fill="#fff"/><g fill="#000">${rects}</g><text x="${W/2}" y="${h+13}" font-size="12" text-anchor="middle" font-family="monospace">${code}</text></svg>`;
}

/* ============== 掃碼作業頁 ============== */
var lastScans = [];
var scanning = false, scanStream = null, scanDetector = null, zxReader = null, scanBusy = false;
window.__scanActive = function(){ if(scanning && state.tab !== 'scan') stopScan(); };

function vScan(){
  const native = ('BarcodeDetector' in window);
  return `<div class="card"><h3>📷 掃碼庫存作業</h3>
  <p class="note">手機開啟本頁（需 HTTPS，GitHub Pages 網址即可）→「開始掃描」→ 對準<b>商品條碼</b>或<b>機身序號條碼</b>（如 4664-004688）。<br>
  ✅ 配件 → 出貨／入庫／盤點／調撥；🖥️ 機器序號 → 出貨交機／調撥／DEMO借出／保固查詢；❓ 查無 → 詢問是否新增庫存。
  ${native ? '' : '<br>⚠️ 此瀏覽器不支援原生條碼辨識，掃描時將自動載入 ZXing 函式庫（iPhone Safari 適用）。'}</p>
  <div class="scanwrap"><video id="scanVideo" playsinline muted autoplay></video><div class="scanframe"></div></div>
  <div id="scanMsg" class="note mt"></div>
  <div class="flexrow mt">
    <button class="btn" id="scanBtn" onclick="toggleScan()">${scanning?'⏹ 停止掃描':'📷 開始掃描'}</button>
    <button class="btn ghost" onclick="openBarcodeSheet()">📋 品項條碼清單</button>
  </div>
  <h4>手動輸入條碼（桌機測試用）</h4>
  <div class="flexrow"><input id="manualCode" placeholder="輸入或貼上條碼號碼" style="width:220px" onkeydown="if(event.key==='Enter')manualLookup()">
  <button class="btn sm" onclick="manualLookup()">查詢</button></div>
  <h4 class="mt">最近掃描</h4>
  ${lastScans.length ? `<table><thead><tr><th>時間</th><th>條碼</th><th>品項</th><th>動作</th></tr></thead><tbody>
    ${lastScans.slice(0,12).map(s=>`<tr><td class="note">${fmtDT(s.ts)}</td><td style="font-family:monospace">${esc(s.code)}</td><td>${s.item?esc(s.item):'<span class="badge b-red">查無</span>'}</td><td>${esc(s.action||'—')}</td></tr>`).join('')}
  </tbody></table>` : '<p class="note">尚無掃描記錄。</p>'}
  </div>`;
}

function scanMsg(m){ const el = $('scanMsg'); if(el) el.innerHTML = m; }
function toggleScan(){ scanning ? stopScan() : startScan(); }

async function startScan(){
  scanning = true; scanBusy = false;
  if($('scanBtn')) $('scanBtn').textContent = '⏹ 停止掃描';
  scanMsg('開啟相機中…');
  try{
    if('BarcodeDetector' in window){
      try{ scanDetector = new BarcodeDetector({ formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'] }); }
      catch(e){ scanDetector = new BarcodeDetector(); }
      scanStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
      const v = $('scanVideo'); v.srcObject = scanStream; await v.play();
      scanMsg('📡 掃描中，請將條碼對準框內…');
      scanTick();
    } else {
      await loadZXing();
      zxReader = new ZXing.BrowserMultiFormatReader();
      scanMsg('📡 掃描中（ZXing），請將條碼對準框內…');
      await zxReader.decodeFromVideoDevice(undefined, 'scanVideo', (result)=>{
        if(result && scanning && !scanBusy) onCode(result.getText());
      });
    }
  }catch(e){
    scanning = false;
    if($('scanBtn')) $('scanBtn').textContent = '📷 開始掃描';
    scanMsg('❌ 無法開啟相機：' + esc(e.message) + '<br>請確認已允許相機權限並使用 HTTPS 網址，或改用下方手動輸入。');
  }
}
function scanTick(){
  if(!scanning || !scanDetector) return;
  const v = $('scanVideo');
  if(!v){ stopScan(); return; }
  scanDetector.detect(v)
    .then(codes=>{ if(codes && codes.length && scanning && !scanBusy) onCode(codes[0].rawValue); })
    .catch(()=>{})
    .finally(()=>{ if(scanning) setTimeout(scanTick, 250); });
}
function stopScan(){
  scanning = false;
  if(zxReader){ try{ zxReader.reset(); }catch(e){} zxReader = null; }
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream = null; }
  const v = $('scanVideo'); if(v) v.srcObject = null;
  if($('scanBtn')) $('scanBtn').textContent = '📷 開始掃描';
  scanMsg('');
}
function loadZXing(){
  return new Promise((res, rej)=>{
    if(window.ZXing) return res();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
    s.onload = ()=>res();
    s.onerror = ()=>rej(new Error('ZXing 函式庫載入失敗（請檢查網路）'));
    document.head.appendChild(s);
  });
}
function beep(){
  try{
    const a = new (window.AudioContext||window.webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.frequency.value = 1400; g.gain.value = .12;
    o.start(); setTimeout(()=>{ o.stop(); a.close(); }, 120);
  }catch(e){}
}
function onCode(code){
  scanBusy = true;
  stopScan();
  try{ navigator.vibrate && navigator.vibrate(80); }catch(e){}
  beep();
  handleCode(String(code).trim());
  scanBusy = false;
}
function manualLookup(){
  const c = $('manualCode').value.trim();
  if(!c) return toast('請輸入條碼號碼');
  handleCode(c);
}

/* ── 掃到條碼：判斷有無庫存（配件條碼 → 機器序號 → 查無） ── */
function normCode(c){ return String(c).trim().toUpperCase().replace(/[^0-9A-Z]/g,''); }
function lookupPart(code){
  if(state.barcodes[code]) return state.barcodes[code];
  const n = normCode(code);
  for(const [c,id] of Object.entries(state.barcodes)) if(normCode(c)===n) return id;
  return null;
}
function lookupMachine(code){
  const n = normCode(code);
  return state.machineReg.find(m=>normCode(m.sn)===n);
}
function handleCode(code){
  code = String(code).trim();
  const rec = { ts:Date.now(), code, item:null, action:null };
  lastScans.unshift(rec);
  const id = lookupPart(code);
  if(id && state.inv.parts[id]){
    rec.item = cat(id).name;
    openItemAction(code, id, rec);
  } else {
    const m = lookupMachine(code);
    if(m){ rec.item = `${m.model}（機器）`; openMachineAction(m.sn, rec); }
    else openBindOrCreate(code, rec);
  }
  render();
}

/* ============== 機器序號追蹤（單台建檔） ============== */
const MACHINE_MODEL_DEFAULT = 'Roboclean SPlus / 114K1';
function seedMachines(){
  const now = new Date();
  return [
    { sn:'4664-004688', model:'Roboclean SPlus / 114K1', type:'全新機器', wh:'north', status:'在庫',
      history:[{ ts:Date.now()-86400000*7, action:'進倉建檔', staff:'張控存' }] },
    { sn:'4664-003125', model:'Roboclean SPlus / 114K1', type:'全新機器', wh:'north', status:'已出貨',
      owner:'王小明', shipDate: iso(addMonths(now,-10)),
      history:[{ ts:Date.now()-86400000*300, action:'進倉建檔', staff:'張控存' },
               { ts:addMonths(now,-10).getTime(), action:'出貨交機 王小明', staff:'李佳玲' }] },
  ];
}
const M_STATUS = { '在庫':'b-green', '已出貨':'b-blue', '借出中':'b-amber' };
function machineRow(m){ return state.machines.find(r=>r.name===m.type); }

function openMachineAction(sn, rec){
  const m = state.machineReg.find(x=>x.sn===sn);
  scanCtx = { sn, rec };
  const w = m.shipDate ? warranty(m.shipDate) : null;
  let loc = '';
  if(m.status==='在庫') loc = `${WH_LABEL[m.wh]}倉`;
  if(m.status==='已出貨') loc = `客戶：${esc(m.owner||'—')}`;
  if(m.status==='借出中') loc = `借用人：${esc(m.borrower||'—')}（原倉 ${WH_LABEL[m.wh]}）`;
  let h = `<h3>🖥️ 已找到機器</h3>
  <div class="okbox"><b style="font-size:16px">${esc(m.model)}</b>　<span class="badge b-gray">${esc(m.type)}</span>
  <span class="badge ${M_STATUS[m.status]}">${m.status}</span><br>
  <span class="note" style="font-family:monospace">序號 ${esc(m.sn)}</span></div>
  <div class="kv"><b>位置／持有</b>${loc}
  ${m.shipDate ? `<br><b>出貨日期</b>${fmtDate(m.shipDate)}　${wBadge(w)}` : ''}</div>
  <h4>機器歷程</h4>
  <table><thead><tr><th>時間</th><th>動作</th><th>操作人員</th></tr></thead><tbody>
  ${m.history.slice().reverse().map(x=>`<tr><td class="note">${fmtDT(x.ts)}</td><td>${esc(x.action)}</td><td>${esc(x.staff)}</td></tr>`).join('')}
  </tbody></table>`;
  if(m.status==='在庫'){
    h += `<h4>請選擇作業</h4>
    <div class="pill-tabs">
      <div class="pill" id="ma_ship" onclick="mAct('ship')">🚚 出貨交機</div>
      <div class="pill" id="ma_move" onclick="mAct('move')">🔁 調撥</div>
      <div class="pill" id="ma_lend" onclick="mAct('lend')">🤝 DEMO借出</div>
    </div><div id="maForm"></div>`;
  } else {
    h += `<div class="mt flexrow">
      <button class="btn" onclick="mAct('return')">↩️ ${m.status==='已出貨'?'返廠入庫':'歸還入庫'}</button>
      ${m.status==='已出貨' ? '<span class="note">維修收件時掃序號即可核對保固。</span>' : ''}
    </div><div id="maForm"></div>`;
  }
  openModal(h);
  if(m.status==='在庫') mAct('ship');
}
function mAct(t){
  scanCtx.act = t;
  ['ship','move','lend'].forEach(k=>{ const p = $('ma_'+k); if(p) p.className = 'pill' + (k===t?' on':''); });
  let f = '<div class="grid2 mt">';
  if(t==='ship') f += `<div class="field"><span>交機對象（客戶／業務）*</span><input id="ma_owner" style="width:100%"></div>
    <div class="field"><span>出貨日期 *（保固起算）</span><input type="date" id="ma_date" value="${todayISO()}" style="width:100%"></div>`;
  if(t==='move') f += `<div class="field"><span>調撥至 *</span><select id="ma_to" style="width:100%">${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}倉庫</option>`).join('')}</select></div>`;
  if(t==='lend') f += `<div class="field"><span>借用業務／借用人 *</span><input id="ma_borrower" style="width:100%"></div>`;
  f += `<div class="field"><span>操作人員姓名 *</span><input id="ma_staff" style="width:100%"></div></div>
  <button class="btn green" onclick="submitMachineAct()">確認${{ship:'出貨交機',move:'調撥',lend:'借出',return:'入庫'}[t]}</button>`;
  $('maForm').innerHTML = f;
}
function submitMachineAct(){
  const { sn, rec, act } = scanCtx;
  const m = state.machineReg.find(x=>x.sn===sn);
  const staff = $('ma_staff').value.trim();
  if(!staff) return toast('請填寫操作人員姓名');
  const row = machineRow(m);
  const label = `${m.type}（${m.model}）`;
  if(act==='ship'){
    const owner = $('ma_owner').value.trim(), date = $('ma_date').value;
    if(!owner || !date) return toast('請填寫交機對象與出貨日期');
    m.status = '已出貨'; m.owner = owner; m.shipDate = date;
    if(row) row[m.wh] = Math.max(0, row[m.wh]-1);
    m.history.push({ ts:Date.now(), action:'出貨交機 '+owner, staff });
    logTxn('機器出貨', label, WH_LABEL[m.wh], -1, staff, '', `序號 ${m.sn}｜交機 ${owner}｜保固至 ${warranty(date).end}`);
    rec.action = '出貨交機 '+owner;
  } else if(act==='move'){
    const to = $('ma_to').value;
    if(to===m.wh) return toast('調撥來源與目的相同');
    if(row){ row[m.wh] = Math.max(0, row[m.wh]-1); row[to]++; }
    m.history.push({ ts:Date.now(), action:`調撥 ${WH_LABEL[m.wh]}→${WH_LABEL[to]}`, staff });
    logTxn('調撥', label, `${WH_LABEL[m.wh]}→${WH_LABEL[to]}`, 1, staff, '', `序號 ${m.sn}（掃碼）`);
    rec.action = `調撥 ${WH_LABEL[m.wh]}→${WH_LABEL[to]}`;
    m.wh = to;
  } else if(act==='lend'){
    const borrower = $('ma_borrower').value.trim();
    if(!borrower) return toast('請填寫借用人');
    m.status = '借出中'; m.borrower = borrower;
    if(row) row[m.wh] = Math.max(0, row[m.wh]-1);
    const dtype = m.type==='租賃Demo' ? 'Demo機租賃' : (m.type.includes('拍打頭') ? '借DEMO拍打頭' : '借DEMO主機');
    state.demoLog.unshift({ date:todayISO(), type:dtype, person:borrower, qty:1, note:'掃碼借出｜序號 '+m.sn, staff, ts:Date.now() });
    m.history.push({ ts:Date.now(), action:'DEMO借出 '+borrower, staff });
    logTxn('DEMO借出', label, WH_LABEL[m.wh], -1, staff, '', `序號 ${m.sn}｜借用 ${borrower}`);
    rec.action = 'DEMO借出 '+borrower;
  } else if(act==='return'){
    const from = m.status;
    if(from==='借出中'){
      state.demoLog.unshift({ date:todayISO(), type:'借DEMO主機', person:m.borrower||'—', qty:1, note:'歸還｜序號 '+m.sn, staff, ts:Date.now() });
    }
    m.status = '在庫'; m.borrower = null;
    if(row) row[m.wh]++;
    m.history.push({ ts:Date.now(), action:(from==='已出貨'?'返廠入庫':'歸還入庫'), staff });
    logTxn('機器入庫', label, WH_LABEL[m.wh], 1, staff, '', `序號 ${m.sn}｜${from==='已出貨'?'返廠':'歸還'}`);
    rec.action = from==='已出貨' ? '返廠入庫' : '歸還入庫';
  }
  save(); toast('✅ ' + rec.action + '，已寫入流水帳'); closeModal(); render();
}

/* ── 有庫存：出貨／入庫／盤點／調撥 ── */
var scanCtx = null;
function openItemAction(code, id, rec){
  scanCtx = { code, id, rec };
  const c = cat(id), e = state.inv.parts[id], t = partTotals(id);
  openModal(`<h3>✅ 已找到庫存品項</h3>
  <div class="okbox"><b style="font-size:16px">${esc(c.name)}</b>${c.custom?' <span class="badge b-blue">自訂</span>':''}　${fsBadge(id)}<br>
  <span class="note" style="font-family:monospace">條碼 ${esc(code)}</span></div>
  <table><thead><tr><th>倉別</th><th>庫存</th><th>安全量</th></tr></thead><tbody>
    ${WHS.map(w=>`<tr><td>${WH_LABEL[w]}</td><td class="${e[w].q<=e[w].s?'low':''}">${e[w].q}</td><td>${e[w].s}</td></tr>`).join('')}
    <tr><td><b>合計</b></td><td><b>${t.q}</b></td><td>${t.s}</td></tr>
  </tbody></table>
  <h4>請選擇作業</h4>
  <div class="pill-tabs">
    <div class="pill" id="sa_out" onclick="scanAct('out')">📤 出貨</div>
    <div class="pill" id="sa_in" onclick="scanAct('in')">📥 入庫</div>
    <div class="pill" id="sa_count" onclick="scanAct('count')">🔢 盤點</div>
    <div class="pill" id="sa_move" onclick="scanAct('move')">🔁 調撥</div>
  </div>
  <div id="saForm"></div>`);
  scanAct('out');
}
function scanAct(t){
  scanCtx.act = t;
  ['out','in','count','move'].forEach(k=>{ const p = $('sa_'+k); if(p) p.className = 'pill' + (k===t?' on':''); });
  const e = state.inv.parts[scanCtx.id];
  const whSel = (idAttr)=>`<select id="${idAttr}" style="width:100%">${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}（現有 ${e[w].q}）</option>`).join('')}</select>`;
  let f = `<div class="grid2 mt">`;
  if(t==='move'){
    f += `<div class="field"><span>調撥自 *</span>${whSel('sa_wh')}</div>
          <div class="field"><span>調撥至 *</span>${whSel('sa_to')}</div>
          <div class="field"><span>數量 *</span><input type="number" id="sa_qty" value="1" min="1" style="width:100%"></div>`;
  } else if(t==='count'){
    f += `<div class="field"><span>盤點倉別 *</span>${whSel('sa_wh')}</div>
          <div class="field"><span>實盤數量 *（系統自動計算差異調整）</span><input type="number" id="sa_qty" min="0" placeholder="實際清點數" style="width:100%"></div>`;
  } else {
    f += `<div class="field"><span>${t==='out'?'出貨倉別':'進倉位置'} *</span>${whSel('sa_wh')}</div>
          <div class="field"><span>數量 *</span><input type="number" id="sa_qty" value="1" min="1" style="width:100%"></div>`;
  }
  f += `<div class="field"><span>操作人員姓名 *</span><input id="sa_staff" style="width:100%"></div>
        <div class="field"><span>備註／關聯單號</span><input id="sa_note" style="width:100%"></div></div>
        <button class="btn green" onclick="submitScanAct()">確認${{out:'出貨',in:'入庫',count:'盤點',move:'調撥'}[t]}</button>`;
  $('saForm').innerHTML = f;
}
function submitScanAct(){
  const { id, act, rec } = scanCtx;
  const staff = $('sa_staff').value.trim();
  if(!staff) return toast('請填寫操作人員姓名');
  const wh = $('sa_wh').value;
  const q = parseInt($('sa_qty').value);
  const note = $('sa_note').value.trim();
  const e = state.inv.parts[id];
  if(act==='count'){
    if(isNaN(q) || q<0) return toast('請填寫實盤數量');
    const book = e[wh].q, diff = q - book;
    if(diff===0){ rec.action = `盤點 ${WH_LABEL[wh]}：帳實相符（${q}）`; save(); toast('✅ 盤點完成：帳實相符'); closeModal(); render(); return; }
    adjustPart(id, wh, diff, '盤點調整', staff, '', `帳面${book}→實盤${q}${note?'｜'+note:''}`);
    rec.action = `盤點 ${WH_LABEL[wh]}：調整 ${diff>0?'+':''}${diff}`;
  } else if(act==='move'){
    const to = $('sa_to').value;
    if(to===wh) return toast('調撥來源與目的不可相同');
    if(isNaN(q) || q<1) return toast('請填寫有效數量');
    if(e[wh].q < q) return toast('來源倉庫存不足');
    adjustPart(id, wh, -q, '調撥', staff, '', `掃碼調出至${WH_LABEL[to]}${note?'｜'+note:''}`);
    adjustPart(id, to, q, '調撥', staff, '', `掃碼自${WH_LABEL[wh]}調入${note?'｜'+note:''}`);
    rec.action = `調撥 ${WH_LABEL[wh]}→${WH_LABEL[to]} ×${q}`;
  } else {
    if(isNaN(q) || q<1) return toast('請填寫有效數量');
    if(act==='out' && e[wh].q < q) return toast(`${WH_LABEL[wh]}倉庫存不足（現有 ${e[wh].q}）`);
    adjustPart(id, wh, act==='in'?q:-q, act==='in'?'入庫(掃碼)':'出貨(掃碼)', staff, '', note);
    rec.action = `${act==='in'?'入庫':'出貨'} ${WH_LABEL[wh]} ×${q}`;
  }
  save(); toast('✅ ' + rec.action + '，已寫入流水帳'); closeModal(); render();
}

/* ── 查無條碼：先詢問是否新增庫存 ── */
function openBindOrCreate(code, rec){
  scanCtx = { code, rec };
  const likelySN = /[-A-Za-z]/.test(code) || !/^\d{13}$/.test(code); // 含破折號/字母或非EAN-13 → 較可能是機器序號
  openModal(`<h3>❓ 查無此條碼</h3>
  <div class="warnbox">條碼 <b style="font-family:monospace">${esc(code)}</b> 不在庫存系統中。${likelySN?'<br><span class="note">格式類似機器序號（如 4664-004688）。</span>':''}</p></div>
  <p style="font-size:16px;margin:14px 0"><b>是否要新增此庫存？</b></p>
  <div class="flexrow">
    ${likelySN
      ? `<button class="btn green" onclick="openCreateMachine()">✅ 是，新增機器（序號建檔）</button>
         <button class="btn" onclick="openCreateForm()">📦 是，新增配件品項</button>`
      : `<button class="btn green" onclick="openCreateForm()">✅ 是，新增配件品項</button>
         <button class="btn" onclick="openCreateMachine()">🖥️ 是，新增機器（序號建檔）</button>`}
    <button class="btn ghost" onclick="cancelNotFound()">❌ 否，取消</button>
  </div>
  <p class="note mt">此條碼其實是既有商品（如新包裝、原廠國際條碼）？<a href="javascript:openBindForm()">改為綁定到既有品項 →</a></p>`);
}
function openCreateMachine(){
  const { code } = scanCtx;
  openModal(`<h3>🖥️ 新增機器（序號建檔）</h3>
  <div class="infobox">以掃描到的序號為此台機器建立唯一追蹤檔案（型號登錄）。</div>
  <div class="grid2">
    <div class="field"><span>機器序號 *</span><input id="nm_sn" value="${esc(code)}" style="width:100%;font-family:monospace"></div>
    <div class="field"><span>機器型號 *</span><input id="nm_model" value="${MACHINE_MODEL_DEFAULT}" style="width:100%"></div>
    <div class="field"><span>機器類型 *</span><select id="nm_type" style="width:100%">${state.machines.map(r=>`<option>${r.name}</option>`).join('')}</select></div>
    <div class="field"><span>進倉位置 *</span><select id="nm_wh" style="width:100%">${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}倉庫</option>`).join('')}</select></div>
    <div class="field"><span>進倉點收人員姓名 *</span><input id="nm_staff" style="width:100%"></div>
    <div class="field"><span>備註</span><input id="nm_note" style="width:100%"></div>
  </div>
  <div class="flexrow">
    <button class="btn green" onclick="createMachineFromScan()">建檔並入庫</button>
    <button class="btn ghost" onclick="openBindOrCreate(scanCtx.code, scanCtx.rec)">← 返回</button>
  </div>`);
}
function createMachineFromScan(){
  const { rec } = scanCtx;
  const sn = $('nm_sn').value.trim(), model = $('nm_model').value.trim(), staff = $('nm_staff').value.trim();
  if(!sn) return toast('請填寫機器序號');
  if(!model) return toast('請填寫機器型號');
  if(!staff) return toast('請填寫點收人員姓名');
  if(lookupMachine(sn)) return toast('此序號已建檔');
  const type = $('nm_type').value, wh = $('nm_wh').value, note = $('nm_note').value.trim();
  const m = { sn, model, type, wh, status:'在庫',
    history:[{ ts:Date.now(), action:'進倉建檔' + (note?'｜'+note:''), staff }] };
  state.machineReg.push(m);
  const row = machineRow(m); if(row) row[wh]++;
  logTxn('機器入庫', `${type}（${model}）`, WH_LABEL[wh], 1, staff, '', `序號 ${sn}｜掃碼建檔`);
  rec.item = `${model}（機器）`; rec.action = '序號建檔入庫';
  save(); toast('✅ 機器 ' + sn + ' 已建檔入庫');
  openMachineAction(sn, rec); render();
}
function cancelNotFound(){
  scanCtx.rec.action = '取消';
  save(); closeModal(); render();
  toast('已取消，可繼續掃描');
}
function openCreateForm(){
  const { code } = scanCtx;
  openModal(`<h3>➕ 新增庫存品項</h3>
  <div class="infobox">將綁定條碼 <b style="font-family:monospace">${esc(code)}</b></div>
  <div class="grid2">
    <div class="field"><span>品項名稱 *</span><input id="nw_name" placeholder="如：新款濾心" style="width:100%"></div>
    <div class="field"><span>進倉點收人員姓名 *</span><input id="nw_staff" style="width:100%"></div>
    <div class="field"><span>北部初始數量</span><input type="number" id="nw_n" value="0" min="0" style="width:100%"></div>
    <div class="field"><span>中部初始數量</span><input type="number" id="nw_c" value="0" min="0" style="width:100%"></div>
    <div class="field"><span>南部初始數量</span><input type="number" id="nw_s" value="0" min="0" style="width:100%"></div>
    <div class="field"><span>安全庫存量（各倉套用）</span><input type="number" id="nw_safe" value="2" min="0" style="width:100%"></div>
  </div>
  <div class="flexrow">
    <button class="btn green" onclick="createItemFromScan()">新增品項並入庫</button>
    <button class="btn ghost" onclick="openBindOrCreate(scanCtx.code, scanCtx.rec)">← 返回</button>
  </div>`);
}
function openBindForm(){
  const { code } = scanCtx;
  openModal(`<h3>🔗 綁定到既有品項</h3>
  <div class="infobox">將條碼 <b style="font-family:monospace">${esc(code)}</b> 綁定到系統中的既有品項，之後掃描即可直接作業。</div>
  <div class="flexrow">
    <select id="bd_item" style="max-width:240px">${allItems().map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
    <button class="btn" onclick="bindCode()">綁定條碼</button>
    <button class="btn ghost" onclick="openBindOrCreate(scanCtx.code, scanCtx.rec)">← 返回</button>
  </div>`);
}
function bindCode(){
  const { code, rec } = scanCtx;
  const id = $('bd_item').value;
  state.barcodes[code] = id;
  rec.item = cat(id).name; rec.action = '綁定條碼';
  logTxn('條碼綁定', cat(id).name, '—', 0, '—', '', '條碼 ' + code);
  save(); toast('✅ 已綁定「' + cat(id).name + '」');
  openItemAction(code, id, rec); render();
}
function createItemFromScan(){
  const { code, rec } = scanCtx;
  const name = $('nw_name').value.trim(), staff = $('nw_staff').value.trim();
  if(!name) return toast('請填寫品項名稱');
  if(!staff) return toast('請填寫進倉點收人員姓名');
  const safe = Math.max(0, parseInt($('nw_safe').value)||0);
  const id = 'c' + (++state.seq.c);
  state.customItems.push({ id, name, custom:true });
  state.inv.parts[id] = { north:{q:0,s:safe}, central:{q:0,s:safe}, south:{q:0,s:safe} };
  state.barcodes[code] = id;
  const init = { north:parseInt($('nw_n').value)||0, central:parseInt($('nw_c').value)||0, south:parseInt($('nw_s').value)||0 };
  let any = false;
  WHS.forEach(w=>{ if(init[w]>0){ any = true; adjustPart(id, w, init[w], '新品入庫', staff, '', '掃碼建檔｜條碼 ' + code); } });
  if(!any) logTxn('新品建檔', name, '—', 0, staff, '', '條碼 ' + code);
  rec.item = name; rec.action = '新增品項' + (any ? '並入庫' : '');
  save(); toast('✅ 已新增品項「' + name + '」並綁定條碼');
  closeModal(); render();
}

/* ── 條碼清單（供另一台裝置顯示／列印） ── */
function code39Svg(text){
  const map = { '0':'000110100','1':'100100001','2':'001100001','3':'101100000','4':'000110001',
    '5':'100110000','6':'001110000','7':'000100101','8':'100100100','9':'001100100',
    '-':'010000101','*':'010010100' };
  const t = '*' + String(text).toUpperCase() + '*';
  const nw = 2, ww = 5, h = 56;
  let x = 10, rects = '';
  for(const ch of t){
    const p = map[ch]; if(!p) continue;
    for(let i=0;i<9;i++){
      const w = p[i]==='1' ? ww : nw;
      if(i%2===0) rects += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`;
      x += w;
    }
    x += nw;
  }
  const W = x + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h+16}" viewBox="0 0 ${W} ${h+16}"><rect width="${W}" height="${h+16}" fill="#fff"/><g fill="#000">${rects}</g><text x="${W/2}" y="${h+13}" font-size="12" text-anchor="middle" font-family="monospace">${esc(text)}</text></svg>`;
}
function openBarcodeSheet(){
  const partCards = allItems().map(c=>{
    const code = barcodeOf(c.id);
    if(!code) return '';
    const svg = /^\d{13}$/.test(code) ? ean13Svg(code) : code39Svg(code);
    return `<div class="bc-card"><b>${esc(c.name)}</b><div class="mt">${svg}</div></div>`;
  }).join('');
  const mCards = state.machineReg.map(m=>
    `<div class="bc-card"><b>${esc(m.model)}</b> <span class="badge ${M_STATUS[m.status]}">${m.status}</span><div class="mt">${code39Svg(m.sn)}</div></div>`
  ).join('');
  openModal(`<h3>📋 品項條碼清單</h3>
  <p class="note">用另一台裝置開啟此清單供手機掃描測試，或列印貼於貨架／商品上。</p>
  <h4>🖥️ 機器序號（Code 39，同機身標籤格式）</h4>
  <div class="bc-grid">${mCards}</div>
  <h4 class="mt">📦 配件品項（EAN-13）</h4>
  <div class="bc-grid">${partCards}</div>`);
}

/* ============== 初始化 ============== */
if(!load()) seed();
render();
