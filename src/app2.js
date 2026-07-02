/* ================= 示範資料 seed ================= */
function seed(){
  const now = new Date();
  const pricing = {};
  CATALOG.forEach(c=>{ pricing[c.id] = { biz:c.biz, cust:c.cust }; });

  const parts = {};
  CATALOG.forEach(c=>{ parts[c.id] = { north:{q:8,s:3}, central:{q:5,s:2}, south:{q:5,s:2} }; });
  parts.p3  = { north:{q:2,s:3}, central:{q:1,s:2}, south:{q:1,s:2} };  // 機器濾網 → 預購
  parts.p26 = { north:{q:1,s:2}, central:{q:0,s:1}, south:{q:0,s:1} };  // 寵物包 → 預購
  parts.p13.north.q = 2; parts.p14.north.q = 2; parts.p9.north.q = 3;

  const shipIn  = iso(addMonths(now,-15)); // 保固內
  const shipOut = iso(addMonths(now,-31)); // 已過保

  state = {
    role:'customer', tab:'repairNew', invTab:'parts',
    seq:{ r:3, s:1, n:0 },
    pricing,
    inv:{ parts },
    machines: [
      { name:'全新機器',   north:12, central:5, south:4, tNC:0, tNS:0 },
      { name:'業務備機',   north:6,  central:3, south:3, tNC:0, tNS:0 },
      { name:'主機Demo機', north:4,  central:2, south:2, tNC:1, tNS:0 },
      { name:'拍打頭Demo', north:5,  central:2, south:2, tNC:0, tNS:0 },
      { name:'租賃Demo',   north:3,  central:1, south:1, tNC:0, tNS:0 },
    ],
    otherGoods: [
      { name:'手電筒', north:10, central:6, south:6 },
      { name:'roboclean消毒水', north:24, central:12, south:12 },
      { name:'濾心', north:15, central:8, south:8 },
      { name:'寵物包', north:4, central:2, south:2 },
      { name:'萊潔抗菌液', north:20, central:10, south:10 },
      { name:'檸檬精油', north:12, central:6, south:6 },
      { name:'水洗刮刀(白盒)', north:8, central:4, south:4 },
      { name:'水洗刮刀(黑盒)', north:8, central:4, south:4 },
    ],
    acEquip: [
      { name:'清洗罩', north:6, central:3, south:3, tNC:0, tNS:0 },
      { name:'高壓馬達', north:4, central:2, south:2, tNC:0, tNS:0 },
      { name:'梯子', north:5, central:3, south:3, tNC:0, tNS:0 },
      { name:'噴壺', north:8, central:4, south:4, tNC:0, tNS:0 },
      { name:'測溫槍', north:4, central:2, south:2, tNC:0, tNS:0 },
      { name:'電動十字起子', north:5, central:3, south:3, tNC:0, tNS:0 },
      { name:'手推車', north:3, central:2, south:2, tNC:0, tNS:0 },
      { name:'15米高壓管', north:6, central:3, south:3, tNC:0, tNS:0 },
      { name:'工具包+工具袋', north:6, central:3, south:3, tNC:0, tNS:0 },
      { name:'剪刀', north:8, central:4, south:4, tNC:0, tNS:0 },
      { name:'一字起子', north:8, central:4, south:4, tNC:0, tNS:0 },
      { name:'小刷子', north:10, central:5, south:5, tNC:0, tNS:0 },
      { name:'藥水20L', north:6, central:3, south:3, tNC:0, tNS:0 },
      { name:'藥水5L', north:10, central:5, south:5, tNC:0, tNS:0 },
      { name:'水桶', north:8, central:4, south:4, tNC:0, tNS:0 },
      { name:'空調清洗劑500ml', north:20, central:10, south:10, tNC:0, tNS:0 },
    ],
    papers: [
      { name:'服務訂購單', north:30, central:15, south:15 },
      { name:'服務滿意度調查表', north:30, central:15, south:15 },
      { name:'REF名單', north:20, central:10, south:10 },
      { name:'機器訂購單', north:25, central:12, south:12 },
      { name:'機器出貨單', north:25, central:12, south:12 },
      { name:'現金分期單', north:15, central:8, south:8 },
    ],
    uniforms: [],
    demoLog: [
      { date: iso(addMonths(now,-1)), type:'借DEMO主機', person:'李佳玲', qty:1, note:'客戶展示用', staff:'張控存', ts: addMonths(now,-1).getTime() },
      { date: todayISO(), type:'車上備機', person:'陳大偉', qty:1, note:'例行備機', staff:'張控存', ts: Date.now()-3600000 },
    ],
    txns: [
      { ts: Date.now()-86400000*2, type:'入庫', item:'機器濾網', wh:'北部', delta:+10, staff:'張控存', ref:'', note:'月度進貨' },
      { ts: Date.now()-86400000, type:'調撥', item:'遙控器', wh:'北部→中部', delta:-2, staff:'張控存', ref:'', note:'調撥至中部' },
    ],
    repairs: [], sales: [], notifs: [],
  };

  UNI_STYLES.forEach((st,si)=>{ WHS.forEach((r,ri)=>{
    const sizes = {}; UNI_SIZES.forEach((sz,zi)=>{ sizes[sz] = ((si+ri+zi)%3)+1; });
    state.uniforms.push({ region:r, style:st, sizes });
  }); });

  /* 預置維修單：三種狀態，方便各角色直接體驗 */
  state.repairs.push({
    id:'R-001', createdAt: Date.now()-86400000*3, byRole:'customer',
    customer:{ name:'王小明', phone:'0912-345-678', addr:PERSONA.customer.addr },
    orderNo:'SO-20240120-088', shipDate: shipOut,
    items:['主機','帶電軟管(含遙控器)'], models:{ '主機':'RC-8000' },
    issue:'主機無法啟動，按下電源鍵沒有反應，指示燈不亮。',
    attachments:['故障影片.mp4'],
    delivery:{ method:'courier', courierCo:'黑貓宅急便', trackingNo:'903-123-4567' },
    owAgreed:true, status:'submitted',
  });
  state.repairs.push({
    id:'R-002', createdAt: Date.now()-86400000*2, byRole:'sales',
    customer:{ name:'李佳玲（業務）', phone:'0987-654-321', addr:PERSONA.sales.addr },
    orderNo:'SO-20250315-102', shipDate: shipIn,
    items:['主機','機器濾網'], models:{ '主機':'RC-9000' },
    issue:'吸力變弱，濾網疑似破損，客戶反映運轉聲音異常。',
    attachments:['照片1.jpg'],
    delivery:{ method:'office', office:'central' },
    owAgreed:false, status:'received',
    receive:{ date: iso(addMonths(now,0)), staff:'林點收', checked:['主機','機器濾網'] },
  });
  const w3 = warranty(shipOut);
  state.repairs.push({
    id:'R-003', createdAt: Date.now()-86400000*5, byRole:'customer',
    customer:{ name:'陳美惠', phone:'0933-222-111', addr:'新北市板橋區文化路二段 88 號' },
    orderNo:'SO-20231108-055', shipDate: shipOut,
    items:['遙控器','帶電軟管(含遙控器)'], models:{},
    issue:'遙控器完全沒反應，換電池也無效。',
    attachments:[], delivery:{ method:'north' }, owAgreed:true, status:'quoted',
    receive:{ date: iso(addMonths(now,0)), staff:'林點收', checked:['遙控器','帶電軟管(含遙控器)'] },
    repair:{ date: todayISO(), staff:'吳維修',
      parts:[{ id:'p5', qty:1, human:false, unit:2700, charged:2700 }],
      report:'檢測後確認遙控器內部電路板受潮損壞，無法修復，需更換新品遙控器。軟管本體功能正常。',
      attachments:['檢測照片.jpg'], internalNote:'客戶機器有進水痕跡，疑似人為，已拍照存證。' },
    quote:{ lines:[{ name:'遙控器', qty:1, unit:2700, sub:2700, waived:false }],
      fee: INSPECT_FEE, total: 2700+INSPECT_FEE, sentAt: Date.now()-3600000*5 },
  });

  /* 預置販售單：待對帳 */
  state.sales.push({
    id:'S-001', createdAt: Date.now()-86400000, byRole:'customer',
    buyer:{ name:'王小明', phone:'0912-345-678', addr:PERSONA.customer.addr },
    items:[{ id:'p22', qty:2, unit:400, front:'現貨' }],
    delivery:{ method:'ship', shipVia:'貨運', addr:PERSONA.customer.addr },
    shipFee:SHIP_FEE, total: 800+SHIP_FEE, status:'pending_recon',
    payment:{ method:'bank', date:todayISO(), ref:'55182', shot:'轉帳截圖.png', invoice:{need:false, taxId:''} },
  });

  notify(['receiver'], '📥 新維修申請單 R-001', '王小明送出維修申請（貨運寄件），請於物件到貨後進行點收。', 'R-001');
  notify(['tech'], '🔧 R-002 已完成收件', '請進行拆機檢測並輸入維修報告。', 'R-002');
  notify(['customer'], '📄 R-003 報價單已發送（Email/LINE）', '維修報價 $3,000，請確認是否同意維修並回覆取件方式。', 'R-003');
  notify(['finance'], '💰 S-001 已回填付款資訊', '請進行對帳確認。', 'S-001');
  save();
}

/* ================= 主渲染 ================= */
function setRole(r){ state.role = r; state.tab = ROLE_TABS[r][0]; save(); render(); }
function setTab(t){ state.tab = t; save(); render(); }
function setInvTab(t){ state.invTab = t; save(); render(); }

function render(){
  const sel = $('roleSel');
  sel.innerHTML = Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${state.role===k?'selected':''}>${v}</option>`).join('');
  const tabs = ROLE_TABS[state.role];
  if(!tabs.includes(state.tab)) state.tab = tabs[0];
  $('tabs').innerHTML = tabs.map(t=>{
    const extra = t==='notifs' && unreadCount()>0 ? ` (${unreadCount()})` : '';
    return `<div class="tab ${state.tab===t?'on':''}" onclick="setTab('${t}')">${TAB_LABELS[t]}${extra}</div>`;
  }).join('');
  const V = {
    repairNew:vRepairNew, shop:vShop, orders:vOrders, notifs:vNotifs,
    receive:vReceive, handover:vHandover, overview:vOverview, work:vWork,
    inv:vInventory, review:vReview, pricing:vPricing, txns:vTxns, recon:vRecon,
  };
  $('view').innerHTML = (V[state.tab]||vOverview)();
  const c = unreadCount();
  $('bellCnt').style.display = c>0 ? 'inline-block' : 'none';
  $('bellCnt').textContent = c;
}

/* ============== 列表 row 工具 ============== */
function repairRow(r){
  const [txt, cls] = RSTATUS[r.status];
  const w = warranty(r.shipDate);
  return `<tr>
    <td><b>${r.id}</b>${r.decision==='abandon'?' <span class="badge b-gray">放棄維修</span>':''}</td>
    <td>${esc(r.customer.name)}<div class="note">${ROLES[r.byRole]}申請</div></td>
    <td>${r.items.map(esc).join('、')}</td>
    <td>${wBadge(w)}</td>
    <td><span class="badge ${cls}">${txt}</span></td>
    <td class="note">${R_ACTOR[r.status]}</td>
    <td><button class="btn sm ghost" onclick="openRepair('${r.id}')">開啟</button></td>
  </tr>`;
}
function saleRow(s){
  const [txt, cls] = SSTATUS[s.status];
  return `<tr>
    <td><b>${s.id}</b></td>
    <td>${esc(s.buyer.name)}<div class="note">${ROLES[s.byRole]}</div></td>
    <td>${s.items.map(i=>`${cat(i.id).name}×${i.qty}${i.front==='預購'?' <span class="badge b-amber">預購</span>':''}`).join('、')}</td>
    <td class="right">${money(s.total)}</td>
    <td><span class="badge ${cls}">${txt}</span></td>
    <td class="note">${S_ACTOR[s.status]}</td>
    <td><button class="btn sm ghost" onclick="openSale('${s.id}')">開啟</button></td>
  </tr>`;
}
const R_THEAD = '<tr><th>單號</th><th>申請人</th><th>維修項目</th><th>保固</th><th>狀態</th><th>待辦角色</th><th></th></tr>';
const S_THEAD = '<tr><th>單號</th><th>購買人</th><th>品項</th><th>金額</th><th>狀態</th><th>待辦角色</th><th></th></tr>';

function repairTable(list, empty){
  if(!list.length) return `<p class="note">${empty||'目前沒有單據。'}</p>`;
  return `<table><thead>${R_THEAD}</thead><tbody>${list.map(repairRow).join('')}</tbody></table>`;
}
function saleTable(list, empty){
  if(!list.length) return `<p class="note">${empty||'目前沒有單據。'}</p>`;
  return `<table><thead>${S_THEAD}</thead><tbody>${list.map(saleRow).join('')}</tbody></table>`;
}

/* ============== 通知 / 總覽 ============== */
function vNotifs(){
  const list = state.notifs.filter(n=>n.roles.includes(state.role));
  const html = `<div class="card"><h3>🔔 通知中心（${ROLES[state.role]}）</h3>
    <p class="note">模擬 Email／簡訊／LINE Notify 自動推播。</p>
    ${list.length ? list.map(n=>`
      <div class="notif ${n.read?'':'unread'}" ${n.ref?`style="cursor:pointer" onclick="openRef('${n.ref}')"`:''}>
        <div class="t">${esc(n.title)}</div><div>${esc(n.body)}</div>
        <div class="ts">${fmtDT(n.ts)}${n.ref?' ・點擊開啟 '+n.ref:''}</div>
      </div>`).join('') : '<p class="note">目前沒有通知。</p>'}
  </div>`;
  let dirty = false;
  list.forEach(n=>{ if(!n.read){ n.read = true; dirty = true; } });
  if(dirty) save();
  return html;
}

function vOverview(){
  return `<div class="card"><h3>📋 流程總覽（所有單據）</h3>
    <div class="flexrow" style="margin-bottom:10px"><button class="btn sm ghost" onclick="openGuide()">📖 示範流程指南</button></div>
    <h4>維修單</h4>${repairTable(state.repairs)}
    <h4 class="mt">配件販售單</h4>${saleTable(state.sales)}
  </div>`;
}

function openGuide(){
  openModal(`<h3>📖 示範流程指南</h3>
  <p class="note">用右上角「目前角色」下拉選單切換身分，即可模擬完整流程。</p>
  <h4>流程 A：維修單（6 階段）</h4>
  <ol class="guide-ol">
    <li><b>客戶／業務</b>：「維修申請」填單送出。出貨日期過保時會出現 <b>300 元檢測費同意</b> 防呆勾選。</li>
    <li><b>收件/點收人員</b>：「收件點收」→ 系統自動判斷保固，逐項對點勾選後完成收件。</li>
    <li><b>維修人員</b>：「維修工作台」→ 勾選更換零件（自動帶出庫存量與售價；保固內非人為損壞金額歸零）、填維修報告與內部備註。</li>
    <li><b>系統</b>：自動生成報價單並通知客戶（見通知中心）。</li>
    <li><b>客戶／業務</b>：「我的訂單」開啟該單 → 同意/放棄維修、回填付款資訊、選取件方式。</li>
    <li><b>財務</b>：「對帳作業」確認核帳、填發票 → <b>點收/維修人員</b>：「取件／寄送作業」通知取件或填物流單號結案，<b>系統自動扣減庫存</b>。</li>
  </ol>
  <h4>流程 B：配件販售（5 步驟）</h4>
  <ol class="guide-ol">
    <li><b>客戶／業務</b>：「配件商城」選購（只顯示 現貨/預購，不顯示數量）→ 結帳。</li>
    <li><b>客戶／業務</b>：開啟訂單回填付款資訊。</li>
    <li><b>財務</b>：對帳確認。</li>
    <li><b>控存人員</b>：「收單／預購審查」→ 判斷預購補貨/調撥 → 確認收單備貨完成（自動扣庫存＋通知）。</li>
    <li><b>系統</b>：自動發送取件/寄件通知 → 結案。</li>
  </ol>
  <h4>流程 C：庫存管理（控存人員）</h4>
  <ol class="guide-ol">
    <li>「庫存管理」：零件配件／機器／制服／冷氣設備／紙本表單／Demo借用登記，支援入庫、出庫、調撥（含運送中）、安全庫存設定。</li>
    <li>低於安全庫存 → 自動通知控存＋前台切為「預購」。</li>
    <li>「價目表維護」：可補上 <b>待補</b> 項目價格。「異動記錄」：完整流水帳（操作人＋時間戳）。</li>
  </ol>`);
}
