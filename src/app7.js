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
  <p class="note">手機開啟本頁（需 HTTPS，GitHub Pages 網址即可）→「開始掃描」→ 對準商品條碼。<br>
  ✅ 有庫存 → 選擇 出貨／入庫／盤點／調撥；❓ 查無 → 新增品項或綁定到既有品項。
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

/* ── 掃到條碼：判斷有無庫存 ── */
function handleCode(code){
  const id = state.barcodes[code];
  const rec = { ts:Date.now(), code, item:(id && cat(id)) ? cat(id).name : null, action:null };
  lastScans.unshift(rec);
  if(id && state.inv.parts[id]) openItemAction(code, id, rec);
  else openBindOrCreate(code, rec);
  render();
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
  openModal(`<h3>❓ 查無此條碼</h3>
  <div class="warnbox">條碼 <b style="font-family:monospace">${esc(code)}</b> 不在庫存系統中。</div>
  <p style="font-size:16px;margin:14px 0"><b>是否要新增此庫存品項？</b></p>
  <div class="flexrow">
    <button class="btn green" onclick="openCreateForm()">✅ 是，新增庫存</button>
    <button class="btn ghost" onclick="cancelNotFound()">❌ 否，取消</button>
  </div>
  <p class="note mt">此條碼其實是既有商品（如新包裝、原廠國際條碼）？<a href="javascript:openBindForm()">改為綁定到既有品項 →</a></p>`);
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
function openBarcodeSheet(){
  const cards = allItems().map(c=>{
    const code = barcodeOf(c.id);
    if(!code) return '';
    const svg = /^\d{13}$/.test(code) ? ean13Svg(code)
      : `<div style="font-family:monospace;padding:16px 8px;border:1px dashed #bbb;border-radius:8px;word-break:break-all">${esc(code)}</div>`;
    return `<div class="bc-card"><b>${esc(c.name)}</b><div class="mt">${svg}</div></div>`;
  }).join('');
  openModal(`<h3>📋 品項條碼清單</h3>
  <p class="note">用另一台裝置開啟此清單供手機掃描測試，或列印貼於貨架／商品上。（EAN-13 格式，可直接被掃描）</p>
  <div class="bc-grid">${cards}</div>`);
}

/* ============== 初始化 ============== */
if(!load()) seed();
render();
