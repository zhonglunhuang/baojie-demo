/* ============== 階段1：維修申請 ============== */
function vRepairNew(){
  const p = PERSONA[state.role] || PERSONA.customer;
  return `<div class="card">
    <h3>🛠️ 線上維修申請單（階段 1）</h3>
    <div class="infobox">目前以 <b>${ROLES[state.role]}</b> 身分申請。送出後請切換角色體驗後續流程（右上角可開「流程總覽」→ 指南）。</div>
    <h4>購買者資料</h4>
    <div class="grid2">
      <div class="field"><span>姓名 *</span><input id="rq_name" value="${esc(p.name)}" style="width:100%"></div>
      <div class="field"><span>電話 *</span><input id="rq_phone" value="${esc(p.phone)}" style="width:100%"></div>
      <div class="field"><span>地址</span><input id="rq_addr" value="${esc(p.addr)}" style="width:100%"></div>
    </div>
    <h4>購買資訊</h4>
    <div class="grid2">
      <div class="field"><span>訂單編號</span><input id="rq_orderNo" placeholder="SO-XXXXXXXX" style="width:100%"></div>
      <div class="field"><span>出貨日期 *（系統據此判斷保固，Demo 保固 ${WARRANTY_YEARS} 年）</span>
        <input type="date" id="rq_ship" style="width:100%" onchange="checkOW()"></div>
    </div>
    <div id="owBox"></div>
    <h4>維修項目（可複選）</h4>
    <div>${REPAIR_ITEMS.map((it,i)=>`
      <label class="opt"><input type="checkbox" id="rq_it${i}"> ${it}</label>${(it==='主機'||it==='拍打頭')?`<input id="rq_md${i}" placeholder="${it}型號" style="width:110px;padding:4px 8px;font-size:12px;margin-right:8px">`:''}
    `).join('')}</div>
    <h4>故障原因</h4>
    <textarea id="rq_issue" placeholder="請描述故障情形…"></textarea>
    <h4>照片或影片附件</h4>
    <input type="file" id="rq_file" multiple> <span class="note">（Demo 僅記錄檔名，不實際上傳）</span>
    <h4>送件方式</h4>
    <div>
      <label class="opt"><input type="radio" name="rq_dm" value="north" onchange="dmUI()"> 自送至北部維修部門</label>
      <label class="opt"><input type="radio" name="rq_dm" value="office" onchange="dmUI()"> 自送至就近辦事處</label>
      <label class="opt"><input type="radio" name="rq_dm" value="courier" onchange="dmUI()"> 貨運寄件</label>
    </div>
    <div id="dmBox" class="mt"></div>
    <div class="mt"><button class="btn" onclick="submitRepair()">送出維修申請</button></div>
  </div>`;
}
function checkOW(){
  const w = warranty($('rq_ship').value);
  $('owBox').innerHTML = (w && !w.inW) ? `<div class="warnbox"><b>⚠️ 系統提示（防呆）</b><br>
    本機已過保固（${wBadge(w)}）。<i>如本機已過保固將收取基本送檢費及檢測費共 ${INSPECT_FEE} 元，是否同意？</i><br>
    <label class="opt mt"><input type="checkbox" id="rq_ow"> <b>我同意</b>支付 ${INSPECT_FEE} 元送檢費及檢測費</label></div>` : (w ? `<div class="okbox">${wBadge(w)}　保固內免收檢測費。</div>` : '');
}
function dmUI(){
  const v = document.querySelector('input[name=rq_dm]:checked')?.value;
  let h = '';
  if(v==='north') h = `<div class="infobox">📍 ${OFFICES.north.name}：${OFFICES.north.addr}（系統自動帶出）</div>`;
  if(v==='office') h = `<div class="infobox">請選擇辦事處：
    <label class="opt"><input type="radio" name="rq_off" value="central" checked> ${OFFICES.central.name}（${OFFICES.central.addr}）</label>
    <label class="opt"><input type="radio" name="rq_off" value="south"> ${OFFICES.south.name}（${OFFICES.south.addr}）</label></div>`;
  if(v==='courier') h = `<div class="infobox flexrow">物流公司：<input id="rq_cco" placeholder="如：黑貓宅急便" style="width:160px">　物流單號：<input id="rq_ctn" placeholder="單號" style="width:160px"></div>`;
  $('dmBox').innerHTML = h;
}
function submitRepair(){
  const name = $('rq_name').value.trim(), phone = $('rq_phone').value.trim(), ship = $('rq_ship').value;
  if(!name || !phone) return toast('請填寫姓名與電話');
  if(!ship) return toast('請填寫出貨日期（判斷保固用）');
  const items = [], models = {};
  REPAIR_ITEMS.forEach((it,i)=>{
    if($('rq_it'+i).checked){ items.push(it); const m = $('rq_md'+i); if(m && m.value.trim()) models[it] = m.value.trim(); }
  });
  if(!items.length) return toast('請至少勾選一項維修項目');
  const dm = document.querySelector('input[name=rq_dm]:checked')?.value;
  if(!dm) return toast('請選擇送件方式');
  const delivery = { method:dm };
  if(dm==='office') delivery.office = document.querySelector('input[name=rq_off]:checked')?.value || 'central';
  if(dm==='courier'){
    delivery.courierCo = $('rq_cco').value.trim(); delivery.trackingNo = $('rq_ctn').value.trim();
    if(!delivery.courierCo || !delivery.trackingNo) return toast('貨運寄件請填寫物流公司與單號');
  }
  const w = warranty(ship);
  let owAgreed = false;
  if(!w.inW){
    if(!$('rq_ow') || !$('rq_ow').checked) return toast('⚠️ 已過保固：須勾選「同意支付 300 元檢測費」方可送出');
    owAgreed = true;
  }
  const files = [...($('rq_file').files||[])].map(f=>f.name);
  const id = 'R-' + String(++state.seq.r).padStart(3,'0');
  state.repairs.unshift({
    id, createdAt:Date.now(), byRole:state.role,
    customer:{ name, phone, addr:$('rq_addr').value.trim() },
    orderNo:$('rq_orderNo').value.trim(), shipDate:ship,
    items, models, issue:$('rq_issue').value.trim(), attachments:files,
    delivery, owAgreed, status:'submitted',
  });
  notify(['receiver'], `📥 新維修申請單 ${id}`, `${name} 送出維修申請，請於物件到貨後點收。`, id);
  save(); toast('✅ 維修申請已送出：' + id);
  state.tab = 'orders'; render(); openRepair(id);
}

/* ============== 配件商城 ============== */
function vShop(){
  const kind = kindOf(state.role);
  const goods = CATALOG.filter(c=>c.sale && !(state.role!=='sales' && c.bizOnly) && price(c.id, kind)!=null);
  const cards = goods.map(c=>{
    const inCart = cart.find(x=>x.id===c.id);
    return `<div class="item-card">
      <div class="nm">${c.name} ${fsBadge(c.id)}</div>
      <div class="pr">${money(price(c.id, kind))}</div>
      ${c.note?`<div class="note">${c.note}</div>`:''}
      <div class="flexrow"><input type="number" id="qty_${c.id}" value="${inCart?inCart.qty:1}" min="1" max="99" style="width:64px;padding:5px 8px">
      <button class="btn sm" onclick="addToCart('${c.id}')">加入</button></div>
    </div>`;
  }).join('');
  const kindNote = kind==='biz' ? '（業務價）' : '（客戶價）';
  const total = cartTotal();
  const p = PERSONA[state.role] || PERSONA.customer;
  return `<div class="card"><h3>🛒 配件商城 ${kindNote}</h3>
    <p class="note">前台僅顯示「現貨／預購」狀態，<b>不顯示實際庫存數量</b>（依安全庫存量自動切換）。預購商品仍可下單，由控存人員審查補貨。</p>
    <div class="shop-grid">${cards}</div></div>
  <div class="card"><h3>🧺 購物車與結帳</h3>
    ${cart.length ? `<table><thead><tr><th>品項</th><th>單價</th><th>數量</th><th>小計</th><th></th></tr></thead><tbody>
      ${cart.map(x=>`<tr><td>${cat(x.id).name} ${fsBadge(x.id)}</td><td>${money(price(x.id,kind))}</td><td>${x.qty}</td>
        <td>${money(price(x.id,kind)*x.qty)}</td><td><button class="btn sm warn" onclick="rmCart('${x.id}')">移除</button></td></tr>`).join('')}
    </tbody></table>
    <h4>購買人資料</h4>
    <div class="grid2">
      <div class="field"><span>姓名 *</span><input id="ck_name" value="${esc(p.name)}" style="width:100%"></div>
      <div class="field"><span>電話 *</span><input id="ck_phone" value="${esc(p.phone)}" style="width:100%"></div>
      <div class="field"><span>地址</span><input id="ck_addr" value="${esc(p.addr)}" style="width:100%"></div>
    </div>
    <h4>取件方式</h4>
    <label class="opt"><input type="radio" name="ck_dm" value="pickup" onchange="ckUI()"> 辦事處自取（免運費）</label>
    <label class="opt"><input type="radio" name="ck_dm" value="ship" onchange="ckUI()"> 貨運／郵局寄件（加收運費 ${money(SHIP_FEE)}）</label>
    <div id="ckBox" class="mt"></div>
    <div class="mt"><b>商品合計 ${money(total)}</b><span id="ckTotal"></span></div>
    <div class="mt"><button class="btn green" onclick="checkout()">送出訂單</button></div>`
    : '<p class="note">購物車是空的，請從上方加入商品。</p>'}
  </div>`;
}
function addToCart(id){
  const q = Math.max(1, parseInt($('qty_'+id).value)||1);
  const ex = cart.find(x=>x.id===id);
  if(ex) ex.qty = q; else cart.push({ id, qty:q });
  toast('已加入購物車'); render();
}
function rmCart(id){ cart = cart.filter(x=>x.id!==id); render(); }
function cartTotal(){ const k = kindOf(state.role); return cart.reduce((t,x)=>t+price(x.id,k)*x.qty, 0); }
function ckUI(){
  const v = document.querySelector('input[name=ck_dm]:checked')?.value;
  let h = '';
  if(v==='pickup') h = `<div class="infobox">自取地點：
    <label class="opt"><input type="radio" name="ck_off" value="north" checked> ${OFFICES.north.name}（${OFFICES.north.addr}）</label>
    <label class="opt"><input type="radio" name="ck_off" value="central"> ${OFFICES.central.name}（${OFFICES.central.addr}）</label>
    <label class="opt"><input type="radio" name="ck_off" value="south"> ${OFFICES.south.name}（${OFFICES.south.addr}）</label></div>`;
  if(v==='ship') h = `<div class="infobox flexrow">寄送方式：<select id="ck_via"><option>貨運</option><option>郵局</option></select>
    收件地址：<input id="ck_shipaddr" value="${esc($('ck_addr').value)}" style="width:280px"></div>`;
  $('ckBox').innerHTML = h;
  $('ckTotal').textContent = v==='ship' ? `　＋運費 ${money(SHIP_FEE)} ＝ 總計 ${money(cartTotal()+SHIP_FEE)}` : `　＝ 總計 ${money(cartTotal())}`;
}
function checkout(){
  if(!cart.length) return;
  const name = $('ck_name').value.trim(), phone = $('ck_phone').value.trim();
  if(!name || !phone) return toast('請填寫購買人姓名與電話');
  const dm = document.querySelector('input[name=ck_dm]:checked')?.value;
  if(!dm) return toast('請選擇取件方式');
  const k = kindOf(state.role);
  const delivery = { method:dm };
  let shipFee = 0;
  if(dm==='pickup') delivery.office = document.querySelector('input[name=ck_off]:checked')?.value || 'north';
  else {
    delivery.shipVia = $('ck_via').value; delivery.addr = $('ck_shipaddr').value.trim();
    if(!delivery.addr) return toast('請填寫收件地址');
    shipFee = SHIP_FEE;
  }
  const items = cart.map(x=>({ id:x.id, qty:x.qty, unit:price(x.id,k), front:frontStatus(x.id) }));
  const id = 'S-' + String(++state.seq.s).padStart(3,'0');
  state.sales.unshift({
    id, createdAt:Date.now(), byRole:state.role,
    buyer:{ name, phone, addr:$('ck_addr').value.trim() },
    items, delivery, shipFee,
    total: items.reduce((t,i)=>t+i.unit*i.qty,0)+shipFee,
    status:'pending_payment',
  });
  cart = []; save(); toast('✅ 訂單已成立：'+id+'，請完成付款');
  state.tab = 'orders'; render(); openSale(id);
}

/* ============== 我的訂單 ============== */
function vOrders(){
  return `<div class="card"><h3>📁 我的訂單</h3>
    <p class="note">Demo 模式：顯示全部單據以便展示（實際系統依登入者過濾）。</p>
    <h4>維修單</h4>${repairTable(state.repairs)}
    <h4 class="mt">配件購買訂單</h4>${saleTable(state.sales)}
  </div>`;
}

/* ============== 角色工作清單 ============== */
function vReceive(){
  const list = state.repairs.filter(r=>r.status==='submitted');
  return `<div class="card"><h3>📥 收件點收（維修單 階段 2）</h3>
    <p class="note">物件到貨後開啟單據 → 系統自動顯示保固判定 → 逐項對點勾選 → 完成收件。</p>
    ${repairTable(list, '目前沒有待收件的維修單。可切換「客戶」角色先送出申請。')}
    <h4 class="mt">全部維修單</h4>${repairTable(state.repairs.filter(r=>r.status!=='submitted'))}
  </div>`;
}
function vWork(){
  const list = state.repairs.filter(r=>r.status==='received');
  return `<div class="card"><h3>🔧 維修工作台（維修單 階段 3）</h3>
    <p class="note">開啟單據 → 勾選更換零件（自動帶庫存與售價，保固內非人為損壞歸零）→ 填維修報告 → 送出即自動發送報價單（階段 4）。</p>
    ${repairTable(list, '目前沒有檢測中的維修單。可切換「收件/點收人員」先完成收件。')}
    <h4 class="mt">全部維修單</h4>${repairTable(state.repairs.filter(r=>r.status!=='received'))}
  </div>`;
}
function vHandover(){
  const list = state.repairs.filter(r=>r.status==='reconciled');
  return `<div class="card"><h3>📦 取件／寄送作業（維修單 階段 6）</h3>
    <p class="note">財務核帳完成後：自取 → 輸入可取件時間並通知；貨運 → 填物流單號寄出，系統自動結案並<b>正式扣減庫存</b>。</p>
    ${repairTable(list, '目前沒有待取件／寄送的維修單。')}
    <h4 class="mt">已結案</h4>${repairTable(state.repairs.filter(r=>r.status==='closed'), '尚無結案單據。')}
  </div>`;
}
function vRecon(){
  const rl = state.repairs.filter(r=>r.status==='paid');
  const sl = state.sales.filter(s=>s.status==='pending_recon');
  return `<div class="card"><h3>💰 對帳作業（財務）</h3>
    <p class="note">核對客戶回填的付款資訊 → 勾選確認核帳 → 填發票資訊 → 完成後自動通知後續角色。</p>
    <h4>維修單待對帳</h4>${repairTable(rl, '沒有待對帳的維修單。')}
    <h4 class="mt">販售單待對帳</h4>${saleTable(sl, '沒有待對帳的販售單。')}
    <h4 class="mt">近期已完成</h4>
    ${repairTable(state.repairs.filter(r=>['reconciled','closed'].includes(r.status)), '—')}
    ${saleTable(state.sales.filter(s=>['pending_stock','ready','closed'].includes(s.status)), '—')}
  </div>`;
}
function vReview(){
  const pend = state.sales.filter(s=>s.status==='pending_stock');
  const ready = state.sales.filter(s=>s.status==='ready');
  return `<div class="card"><h3>📦 收單／預購審查（控存）</h3>
    <p class="note">對帳完成的販售訂單在此收單。含「預購」商品時，請判斷補貨或跨區調撥後再確認備貨。</p>
    <h4>待收單備貨</h4>${saleTable(pend, '沒有待收單的訂單。')}
    <h4 class="mt">備貨完成（待結案）</h4>${saleTable(ready, '—')}
    <h4 class="mt">全部販售單</h4>${saleTable(state.sales.filter(s=>!['pending_stock','ready'].includes(s.status)), '—')}
  </div>`;
}

/* ============== Modal 機制 ============== */
let current = null;
function openModal(html){ $('modalBody').innerHTML = html; $('overlay').style.display = 'flex'; }
function closeModal(){ $('overlay').style.display = 'none'; current = null; }
function openRepair(id){ current = { kind:'r', id }; openModal(repairDetailHTML(state.repairs.find(r=>r.id===id))); }
function openSale(id){ current = { kind:'s', id }; openModal(saleDetailHTML(state.sales.find(s=>s.id===id))); }
function refreshModal(){
  if(!current) return;
  if(current.kind==='r') openRepair(current.id); else openSale(current.id);
}
function stepperHTML(steps, done){
  return `<div class="steps">${steps.map((s,i)=>{
    const n = i+1;
    const cls = n<=done ? 'done' : (n===done+1 ? 'now' : '');
    return `<div class="step ${cls}" data-n="${n}">${s}</div>`;
  }).join('')}</div>`;
}
const QR_SVG = `<svg class="qr" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="21" fill="#fff"/><path fill="#000" d="M0 0h7v7H0zM2 2h3v3H2zM14 0h7v7h-7zM16 2h3v3h-3zM0 14h7v7H0zM2 16h3v3H2zM9 0h1v2H9zM11 1h2v1h-2zM9 3h3v1H9zM12 4h1v3h-1zM9 5h1v2H9zM10 6h1v1h-1zM0 9h2v1H0zM3 9h2v2H3zM6 9h1v1H6zM8 8h1v3H8zM10 9h2v1h-2zM13 9h1v2h-1zM15 9h2v1h-2zM18 9h1v1h-1zM20 9h1v2h-1zM1 11h1v2H1zM4 12h3v1H4zM9 11h1v3H9zM11 12h2v1h-2zM14 12h1v2h-1zM16 11h2v2h-2zM19 12h2v1h-2zM9 15h2v1H9zM12 14h1v3h-1zM14 15h3v1h-3zM18 14h1v2h-1zM20 15h1v2h-1zM9 17h1v2H9zM11 18h2v1h-2zM14 17h1v2h-1zM16 18h3v1h-3zM10 20h2v1h-2zM13 20h1v1h-1zM15 20h2v1h-2zM19 20h2v1h-2z"/></svg>`;
