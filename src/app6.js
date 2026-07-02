/* ============== 庫存管理 ============== */
const INV_TABS = { parts:'零件／販售配件', machines:'機器庫存', otherGoods:'其他物品', uniforms:'制服庫存', acEquip:'冷氣清潔設備', papers:'紙本與表單', demo:'Demo借用登記' };

function vInventory(){
  const pills = Object.entries(INV_TABS).map(([k,v])=>`<div class="pill ${state.invTab===k?'on':''}" onclick="setInvTab('${k}')">${v}</div>`).join('');
  const body = {
    parts:invParts, machines:()=>invArr('machines',true), otherGoods:()=>invArr('otherGoods',false),
    uniforms:invUniforms, acEquip:()=>invArr('acEquip',true), papers:()=>invArr('papers',false), demo:invDemo,
  }[state.invTab]();
  return `<div class="card"><h3>🏬 庫存管理（北部／中部／南部分倉）</h3><div class="pill-tabs">${pills}</div>${body}</div>`;
}

function invParts(){
  const lows = CATALOG.filter(c=>frontStatus(c.id)==='預購');
  return `${lows.length?`<div class="warnbox">⚠️ <b>低庫存提醒</b>：${lows.map(c=>c.name).join('、')} 合計庫存 ≤ 安全庫存，前台已自動切換為「預購」。</div>`:''}
  <p class="note">「安」＝該倉安全庫存量。合計 ≤ 安全庫存合計 → 前台自動轉「預購」。每筆異動皆需操作人員並寫入流水帳。</p>
  <table><thead><tr><th>品項</th><th>北部</th><th>中部</th><th>南部</th><th>合計</th><th>前台狀態</th><th></th></tr></thead><tbody>
  ${CATALOG.map(c=>{
    const e = state.inv.parts[c.id], t = partTotals(c.id);
    return `<tr><td>${c.name}</td>
      ${WHS.map(w=>`<td class="${e[w].q<=e[w].s?'low':''}">${e[w].q}<span class="note">/安${e[w].s}</span></td>`).join('')}
      <td><b>${t.q}</b><span class="note">/安${t.s}</span></td>
      <td>${fsBadge(c.id)}</td>
      <td><button class="btn sm ghost" onclick="openAdjust('parts','${c.id}')">異動</button></td></tr>`;
  }).join('')}</tbody></table>`;
}

function invArr(catKey, transit){
  const rows = state[catKey];
  return `<p class="note">${transit?'調撥自北部出發時進入「運送中」，需按「到貨」確認入倉。':''}每筆異動皆記錄操作人員與時間戳。</p>
  <table><thead><tr><th>品項</th><th>北部</th><th>中部</th><th>南部</th>${transit?'<th>運送中(北→中)</th><th>運送中(北→南)</th>':''}<th>合計</th><th></th></tr></thead><tbody>
  ${rows.map((r,i)=>{
    const total = r.north + r.central + r.south + (transit ? (r.tNC + r.tNS) : 0);
    return `<tr><td>${r.name}</td><td>${r.north}</td><td>${r.central}</td><td>${r.south}</td>
      ${transit?`<td>${r.tNC}${r.tNC>0?` <button class="btn sm ghost" onclick="confirmArrive('${catKey}',${i},'tNC')">到貨</button>`:''}</td>
      <td>${r.tNS}${r.tNS>0?` <button class="btn sm ghost" onclick="confirmArrive('${catKey}',${i},'tNS')">到貨</button>`:''}</td>`:''}
      <td><b>${total}</b></td>
      <td><button class="btn sm ghost" onclick="openAdjust('${catKey}',${i})">異動</button></td></tr>`;
  }).join('')}</tbody></table>`;
}

function invUniforms(){
  let h = `<p class="note">款式 × 尺寸 × 地區。點「異動」記錄入庫／出庫（含操作人員與時間戳）。</p>
  <div class="mt"><button class="btn sm" onclick="openUniAdjust()">＋ 制服異動</button></div>`;
  WHS.forEach(rg=>{
    const rows = state.uniforms.filter(u=>u.region===rg);
    let regionTotal = 0;
    h += `<h4>${WH_LABEL[rg]}</h4>
    <table><thead><tr><th>款式</th>${UNI_SIZES.map(s=>`<th>${s}</th>`).join('')}<th>小計</th></tr></thead><tbody>
    ${rows.map(u=>{
      const sub = UNI_SIZES.reduce((t,s)=>t+u.sizes[s],0); regionTotal += sub;
      return `<tr><td>${u.style}</td>${UNI_SIZES.map(s=>`<td>${u.sizes[s]}</td>`).join('')}<td><b>${sub}</b></td></tr>`;
    }).join('')}
    <tr><td><b>合計</b></td><td colspan="${UNI_SIZES.length}"></td><td><b>${regionTotal}</b></td></tr>
    </tbody></table>`;
  });
  return h;
}

function invDemo(){
  return `<p class="note">手抄登記本數位化：車上備機／Demo機租賃／借DEMO主機／借DEMO拍打頭。每筆自動記錄操作人員與時間戳（稽核用）。</p>
  <h4>新增登記</h4>
  <div class="flexrow">
    <input type="date" id="dl_date" value="${todayISO()}">
    <select id="dl_type"><option>車上備機</option><option>Demo機租賃</option><option>借DEMO主機</option><option>借DEMO拍打頭</option></select>
    <input id="dl_person" placeholder="業務／借用人" style="width:130px">
    <input type="number" id="dl_qty" value="1" min="1" style="width:64px">
    <input id="dl_note" placeholder="備註" style="width:150px">
    <input id="dl_staff" placeholder="操作人員 *" style="width:110px">
    <button class="btn sm" onclick="addDemoLog()">登記</button>
  </div>
  <h4 class="mt">登記記錄</h4>
  <table><thead><tr><th>日期</th><th>類型</th><th>業務／借用人</th><th>數量</th><th>備註</th><th>操作人員</th><th>時間戳</th></tr></thead><tbody>
  ${state.demoLog.map(d=>`<tr><td>${fmtDate(d.date)}</td><td>${esc(d.type)}</td><td>${esc(d.person)}</td><td>${d.qty}</td><td>${esc(d.note||'—')}</td><td>${esc(d.staff)}</td><td class="note">${fmtDT(d.ts)}</td></tr>`).join('')}
  </tbody></table>`;
}
function addDemoLog(){
  const staff = $('dl_staff').value.trim(), person = $('dl_person').value.trim();
  if(!person || !staff) return toast('請填寫借用人與操作人員（稽核必填）');
  state.demoLog.unshift({ date:$('dl_date').value, type:$('dl_type').value, person,
    qty:Math.max(1,parseInt($('dl_qty').value)||1), note:$('dl_note').value.trim(), staff, ts:Date.now() });
  save(); toast('✅ 已登記'); render();
}

/* ---- 異動 modal ---- */
let adj = null;
function openAdjust(catKey, key){
  adj = { catKey, key };
  const isParts = catKey==='parts';
  const name = isParts ? cat(key).name : state[catKey][key].name;
  const hasTransit = ['machines','acEquip'].includes(catKey);
  openModal(`<h3>庫存異動：${name}</h3>
  <p class="note">分類：${INV_TABS[catKey]}｜每筆異動寫入流水帳（含操作人員與時間戳）。</p>
  <div class="grid2">
    <div class="field"><span>異動類型 *</span><select id="aj_type" style="width:100%" onchange="adjUI()">
      <option value="in">入庫（進倉點收）</option><option value="out">出庫</option>
      <option value="move">調撥</option>${isParts?'<option value="safe">安全庫存設定</option>':''}
    </select></div>
    <div class="field"><span id="aj_whLbl">倉別（進倉位置）*</span><select id="aj_wh" style="width:100%">
      ${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}倉庫</option>`).join('')}</select></div>
    <div class="field" id="aj_toBox" style="display:none"><span>調撥至 *</span><select id="aj_to" style="width:100%">
      ${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}倉庫</option>`).join('')}</select>
      ${hasTransit?'<div class="note">自北部調出將進入「運送中」，需按「到貨」確認。</div>':''}</div>
    <div class="field"><span id="aj_qtyLbl">數量 *</span><input type="number" id="aj_qty" value="1" min="0" style="width:100%"></div>
    <div class="field"><span>進倉／異動日期</span><input type="date" id="aj_date" value="${todayISO()}" style="width:100%"></div>
    <div class="field"><span>點收／操作人員姓名 *</span><input id="aj_staff" style="width:100%"></div>
    <div class="field"><span>型號／序號登錄</span><input id="aj_sn" placeholder="唯一序號或型號（選填）" style="width:100%"></div>
    <div class="field"><span>備註（購買者資料／關聯單號）</span><input id="aj_note" style="width:100%"></div>
  </div>
  <button class="btn" onclick="submitAdjust()">確認異動</button>`);
}
function adjUI(){
  const t = $('aj_type').value;
  $('aj_toBox').style.display = t==='move' ? '' : 'none';
  $('aj_whLbl').textContent = t==='move' ? '調撥自 *' : (t==='in' ? '倉別（進倉位置）*' : '倉別 *');
  $('aj_qtyLbl').textContent = t==='safe' ? '安全庫存量設定值 *' : '數量 *';
}
function submitAdjust(){
  const { catKey, key } = adj;
  const t = $('aj_type').value, wh = $('aj_wh').value, staff = $('aj_staff').value.trim();
  const q = parseInt($('aj_qty').value);
  const sn = $('aj_sn').value.trim(), noteIn = $('aj_note').value.trim();
  if(!staff) return toast('請填寫操作人員姓名（稽核必填）');
  if(isNaN(q) || q<0 || (t!=='safe' && q===0)) return toast('請填寫有效數量');
  const note = [sn?('序號:'+sn):'', noteIn].filter(Boolean).join('｜');
  if(catKey==='parts'){
    if(t==='safe'){
      state.inv.parts[key][wh].s = q;
      logTxn('安全庫存設定', cat(key).name, WH_LABEL[wh], q, staff, '', note||'設定安全庫存值');
      if(frontStatus(key)==='預購') notify(['stock'],'⚠️ 低庫存提醒',`「${cat(key).name}」合計庫存 ≤ 新安全庫存量，前台已切為「預購」。`,null);
    }
    else if(t==='in') adjustPart(key, wh, q, '入庫', staff, '', note);
    else if(t==='out') adjustPart(key, wh, -q, '出庫', staff, '', note);
    else {
      const to = $('aj_to').value;
      if(to===wh) return toast('調撥來源與目的不可相同');
      adjustPart(key, wh, -q, '調撥', staff, '', `調出至${WH_LABEL[to]}${note?'｜'+note:''}`);
      adjustPart(key, to, q, '調撥', staff, '', `自${WH_LABEL[wh]}調入${note?'｜'+note:''}`);
    }
  } else {
    const row = state[catKey][key];
    const hasTransit = ['machines','acEquip'].includes(catKey);
    if(t==='in'){ row[wh]+=q; logTxn('入庫', row.name, WH_LABEL[wh], q, staff, '', note); }
    else if(t==='out'){ row[wh]-=q; logTxn('出庫', row.name, WH_LABEL[wh], -q, staff, '', note); }
    else {
      const to = $('aj_to').value;
      if(to===wh) return toast('調撥來源與目的不可相同');
      if(row[wh]<q) return toast('來源倉庫存不足');
      row[wh]-=q;
      if(hasTransit && wh==='north' && to!=='north'){
        row[to==='central'?'tNC':'tNS'] += q;
        logTxn('調撥(運送中)', row.name, `北部→${WH_LABEL[to]}`, -q, staff, '', note||'運送中，待到貨確認');
      } else {
        row[to]+=q;
        logTxn('調撥', row.name, `${WH_LABEL[wh]}→${WH_LABEL[to]}`, q, staff, '', note);
      }
    }
  }
  save(); toast('✅ 異動完成，已寫入流水帳'); closeModal(); render();
}
function confirmArrive(catKey, i, field){
  const staff = prompt('到貨點收人員姓名：'); if(!staff) return;
  const row = state[catKey][i];
  const q = row[field], to = field==='tNC' ? 'central' : 'south';
  row[field] = 0; row[to] += q;
  logTxn('到貨入倉', row.name, WH_LABEL[to], q, staff, '', '調撥運送到貨');
  save(); toast('✅ 到貨入倉完成'); render();
}

function openUniAdjust(){
  openModal(`<h3>制服庫存異動</h3>
  <div class="grid2">
    <div class="field"><span>類型 *</span><select id="ua_type" style="width:100%"><option value="in">入庫</option><option value="out">出庫</option></select></div>
    <div class="field"><span>地區 *</span><select id="ua_rg" style="width:100%">${WHS.map(w=>`<option value="${w}">${WH_LABEL[w]}</option>`).join('')}</select></div>
    <div class="field"><span>款式 *</span><select id="ua_st" style="width:100%">${UNI_STYLES.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <div class="field"><span>尺寸 *</span><select id="ua_sz" style="width:100%">${UNI_SIZES.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <div class="field"><span>數量 *</span><input type="number" id="ua_qty" value="1" min="1" style="width:100%"></div>
    <div class="field"><span>操作人員 *</span><input id="ua_staff" style="width:100%"></div>
  </div>
  <button class="btn" onclick="submitUniAdjust()">確認異動</button>`);
}
function submitUniAdjust(){
  const staff = $('ua_staff').value.trim();
  if(!staff) return toast('請填寫操作人員姓名');
  const q = Math.max(1, parseInt($('ua_qty').value)||1);
  const rg = $('ua_rg').value, st = $('ua_st').value, sz = $('ua_sz').value;
  const row = state.uniforms.find(u=>u.region===rg && u.style===st);
  const delta = $('ua_type').value==='in' ? q : -q;
  if(row.sizes[sz]+delta < 0) return toast('庫存不足');
  row.sizes[sz] += delta;
  logTxn(delta>0?'入庫':'出庫', `制服 ${st} ${sz}`, WH_LABEL[rg], delta, staff, '', '');
  save(); toast('✅ 制服異動完成'); closeModal(); render();
}

/* ============== 價目表維護 ============== */
function vPricing(){
  return `<div class="card"><h3>💲 全局價目表維護（Master Data）</h3>
  <p class="note">維修模組與販售模組共同調用。<span class="badge b-red">待補</span> 項目請輸入初始值後儲存，維修工作台即可勾選。</p>
  <table><thead><tr><th>物品/零件名稱</th><th>業務販售/維修金額</th><th>客戶販售/維修金額</th><th>備註</th><th></th></tr></thead><tbody>
  ${CATALOG.map(c=>{
    const p = state.pricing[c.id];
    const tbd = p.biz==null;
    return `<tr ${tbd?'style="background:#fff8f0"':''}>
      <td>${c.name} ${tbd?'<span class="badge b-red">待補</span>':''}</td>
      <td><input type="number" id="pr_b_${c.id}" value="${p.biz==null?'':p.biz}" placeholder="待補" style="width:110px;padding:5px 8px"></td>
      <td>${c.cust==null&&c.bizOnly?'<span class="note">—（業務專用）</span>':`<input type="number" id="pr_c_${c.id}" value="${p.cust==null?'':p.cust}" placeholder="待補" style="width:110px;padding:5px 8px">`}</td>
      <td class="note">${c.note||(c.bizOnly?'業務專用品項':'')}</td>
      <td><button class="btn sm" onclick="savePrice('${c.id}')">儲存</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function savePrice(id){
  const c = cat(id);
  const b = $('pr_b_'+id).value, ce = $('pr_c_'+id);
  state.pricing[id].biz = b==='' ? null : Number(b);
  if(ce) state.pricing[id].cust = ce.value==='' ? null : Number(ce.value);
  else state.pricing[id].cust = null;
  save(); toast(`✅ 已更新「${c.name}」價格`); render();
}

/* ============== 異動記錄 ============== */
function vTxns(){
  return `<div class="card"><h3>📒 庫存異動流水帳</h3>
  <p class="note">入庫／出庫／調撥／維修消耗／販售出貨全記錄，含操作人員、時間戳與關聯單號（稽核用）。</p>
  <table><thead><tr><th>時間戳</th><th>類型</th><th>品項</th><th>倉別</th><th>數量±</th><th>操作人員</th><th>關聯單號</th><th>備註</th></tr></thead><tbody>
  ${state.txns.length?state.txns.map(t=>`<tr>
    <td class="note">${fmtDT(t.ts)}</td>
    <td><span class="badge ${t.delta>0?'b-green':(t.type.includes('調撥')?'b-blue':'b-red')}">${t.type}</span></td>
    <td>${esc(t.item)}</td><td>${esc(t.wh)}</td>
    <td class="${t.delta<0?'low':''}">${t.delta>0?'+':''}${t.delta}</td>
    <td>${esc(t.staff)}</td>
    <td>${t.ref?`<a href="javascript:openRef('${t.ref}')">${t.ref}</a>`:'—'}</td>
    <td class="note">${esc(t.note||'—')}</td></tr>`).join(''):'<tr><td colspan="8" class="note">尚無異動記錄。</td></tr>'}
  </tbody></table></div>`;
}

/* ============== 初始化 ============== */
if(!load()) seed();
render();
