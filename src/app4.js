/* ============== 維修單詳情 ============== */
const INTERNAL_ROLES = ['receiver','tech','stock','finance'];

function deliveryText(d){
  if(!d) return '—';
  if(d.method==='north') return `自送｜${OFFICES.north.name}（${OFFICES.north.addr}）`;
  if(d.method==='office') return `自送｜${OFFICES[d.office].name}（${OFFICES[d.office].addr}）`;
  return `貨運寄件｜${esc(d.courierCo||'')} ${esc(d.trackingNo||'')}`;
}
function pickupText(p){
  if(!p) return '—';
  if(p.method==='north') return `北部維修部門自取（${OFFICES.north.addr}）`;
  if(p.method==='office') return `${OFFICES[p.office].name}自取（${OFFICES[p.office].addr}）`;
  return `貨運寄件（收件地址：${esc(p.addr||'')}）`;
}
function payText(p){
  if(!p) return '—';
  return `${p.method==='linepay'?'LinePay':'匯款'}｜付款日 ${fmtDate(p.date)}｜${p.method==='linepay'?'LinePay編號':'轉帳後五碼'}：${esc(p.ref)}${p.shot?`｜截圖：${esc(p.shot)}`:''}${p.invoice&&p.invoice.need?`｜統編：${esc(p.invoice.taxId)}`:'｜不開統編'}`;
}

function repairDetailHTML(r){
  const w = warranty(r.shipDate);
  const [stTxt, stCls] = RSTATUS[r.status];
  const isOrderer = ['customer','sales'].includes(state.role);
  const internal = INTERNAL_ROLES.includes(state.role);
  let h = `<h3>維修單 ${r.id} <span class="badge ${stCls}">${stTxt}</span>${r.decision==='abandon'?' <span class="badge b-gray">放棄維修</span>':''}</h3>
  ${stepperHTML(RSTEPS, RDONE[r.status])}
  <div class="sec"><h4>📋 申請資料（階段 1）</h4><div class="kv">
    <b>申請身分</b>${ROLES[r.byRole]}　<b>申請時間</b>${fmtDT(r.createdAt)}<br>
    <b>購買者</b>${esc(r.customer.name)}／${esc(r.customer.phone)}／${esc(r.customer.addr||'—')}<br>
    <b>訂單編號</b>${esc(r.orderNo||'—')}　<b>出貨日期</b>${fmtDate(r.shipDate)}　${wBadge(w)}<br>
    <b>維修項目</b>${r.items.map(it=>esc(it)+(r.models[it]?`（型號 ${esc(r.models[it])}）`:'')).join('、')}<br>
    <b>故障原因</b>${esc(r.issue||'—')}<br>
    <b>附件</b>${r.attachments.length?r.attachments.map(esc).join('、'):'—'}<br>
    <b>送件方式</b>${deliveryText(r.delivery)}
    ${!w||w.inW?'':`<br><b>過保檢測費</b><span class="badge ${r.owAgreed?'b-green':'b-red'}">${r.owAgreed?'已同意 300 元':'未同意'}</span>`}
  </div></div>`;

  /* 階段 2 */
  if(r.receive){
    h += `<div class="sec"><h4>📥 收件記錄（階段 2）</h4><div class="kv">
      <b>收件日期</b>${fmtDate(r.receive.date)}　<b>點收人員</b>${esc(r.receive.staff)}<br>
      <b>點收項目</b>${r.receive.checked.map(esc).join('、')} ✓ 全數到齊</div></div>`;
  } else if(r.status==='submitted'){
    h += `<div class="sec"><h4>📥 收件點收（階段 2）</h4>`;
    if(state.role==='receiver'){
      h += `<div class="infobox">系統已自動判定保固：${wBadge(w)}</div>
      <div class="grid2">
        <div class="field"><span>收件日期 *</span><input type="date" id="rc_date" value="${todayISO()}" style="width:100%"></div>
        <div class="field"><span>點收人員姓名 *</span><input id="rc_staff" placeholder="請輸入姓名" style="width:100%"></div>
      </div>
      <div class="field"><span>收件項目逐項對點（須全數勾選）</span>
        ${r.items.map((it,i)=>`<label class="opt"><input type="checkbox" id="rc_it${i}"> ${esc(it)}</label>`).join('')}
      </div>
      <button class="btn" onclick="doReceive('${r.id}')">完成點收，進入維修</button>`;
    } else h += `<p class="note">等待「收件/點收人員」到貨點收。（請切換角色操作）</p>`;
    h += `</div>`;
  }

  /* 階段 3 */
  if(r.repair){
    h += `<div class="sec"><h4>🔧 維修報告（階段 3）</h4><div class="kv">
      <b>維修日期</b>${fmtDate(r.repair.date)}　<b>維修人員</b>${esc(r.repair.staff)}<br>
      <b>更換項目</b>${r.repair.parts.length?r.repair.parts.map(p=>`${cat(p.id).name}×${p.qty}${p.charged===0?'（保固內免費）':''}`).join('、'):'無'}<br>
      <b>維修報告</b>${esc(r.repair.report)}<br>
      <b>附件</b>${r.repair.attachments.length?r.repair.attachments.map(esc).join('、'):'—'}
      ${internal?`<br><b style="color:#c0392b">內部備註 🔒</b>${esc(r.repair.internalNote||'—')} <span class="note">（客戶/業務不可見）</span>`:''}
    </div></div>`;
  } else if(r.status==='received'){
    h += `<div class="sec"><h4>🔧 拆機檢測與維修報告（階段 3）</h4>`;
    if(state.role==='tech'){
      const kind = kindOf(r.byRole);
      h += `<div class="infobox">${wBadge(w)}　${w.inW?'保固內：非人為損壞之更換零件<b>金額自動歸零</b>。':'已過保：更換零件依價目表計價，另加檢測費 '+money(INSPECT_FEE)+'。'}</div>
      <div class="grid2">
        <div class="field"><span>維修日期 *</span><input type="date" id="wk_date" value="${todayISO()}" style="width:100%"></div>
        <div class="field"><span>維修人員 *</span><input id="wk_staff" placeholder="請輸入姓名" style="width:100%"></div>
      </div>
      <div class="field"><span>更換項目（勾選自動帶出庫存量與${kind==='biz'?'業務':'客戶'}維修金額）</span>
      <table><thead><tr><th></th><th>零件</th><th>北部庫存</th><th>單價</th><th>數量</th>${w.inW?'<th>人為損壞</th>':''}<th class="right">計價</th></tr></thead><tbody>
      ${CATALOG.filter(c=>c.repair).map(c=>{
        const u = price(c.id, kind);
        const stk = state.inv.parts[c.id].north.q;
        return `<tr>
          <td><input type="checkbox" id="wp_${c.id}" ${u==null?'disabled':''} onchange="workPrev('${r.id}')"></td>
          <td>${c.name}${c.note?`<div class="note">${c.note}</div>`:''}</td>
          <td class="${stk<=state.inv.parts[c.id].north.s?'low':''}">${stk}</td>
          <td>${u==null?'<span class="badge b-red">待補價格</span> <span class="note">請至價目表維護</span>':money(u)}</td>
          <td><input type="number" id="wq_${c.id}" value="1" min="1" max="9" style="width:56px;padding:4px 6px" onchange="workPrev('${r.id}')"></td>
          ${w.inW?`<td><input type="checkbox" id="wh_${c.id}" onchange="workPrev('${r.id}')"></td>`:''}
          <td class="right" id="wc_${c.id}">—</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>
      <div class="right" style="font-size:15px"><b id="wtotal">報價合計 ${money(w.inW?0:INSPECT_FEE)}</b></div>
      <div class="field"><span>維修報告 *（客戶/業務可見）</span><textarea id="wk_report" placeholder="檢測結果與維修說明…"></textarea></div>
      <div class="field"><span>照片或影片附件</span><input type="file" id="wk_file" multiple></div>
      <div class="field"><span>其它內部記錄備註 🔒（僅內部可視）</span><textarea id="wk_note" placeholder="內部備註，客戶/業務不可見…"></textarea></div>
      <button class="btn" onclick="submitWork('${r.id}')">提交維修報告，發送報價單（階段 4）</button>`;
    } else h += `<p class="note">等待「維修人員」拆機檢測。（請切換角色操作）</p>`;
    h += `</div>`;
  }

  /* 階段 4+5：報價單與客戶回覆 */
  if(r.quote){
    h += `<div class="sec"><h4>📄 電子報價單（階段 4・系統自動生成並已透過 Email/LINE 通知）</h4>
    <table><thead><tr><th>項目</th><th>數量</th><th>單價</th><th class="right">小計</th></tr></thead><tbody>
    ${r.quote.lines.map(l=>`<tr><td>${esc(l.name)}${l.waived?' <span class="badge b-green">保固內免費</span>':''}</td><td>${l.qty}</td><td>${money(l.unit)}</td><td class="right">${l.waived?money(0):money(l.sub)}</td></tr>`).join('')}
    ${r.quote.fee?`<tr><td>基本送檢費及檢測費（過保）</td><td>1</td><td>${money(r.quote.fee)}</td><td class="right">${money(r.quote.fee)}</td></tr>`:''}
    <tr><td colspan="3"><b>合計</b></td><td class="right"><b>${money(r.quote.total)}</b></td></tr>
    </tbody></table>
    <p class="note">發送時間：${fmtDT(r.quote.sentAt)}</p></div>`;
  }

  if(r.status==='quoted'){
    h += `<div class="sec"><h4>✅ 維修意願確認與付款（階段 5）</h4>`;
    if(isOrderer){
      const fee = (w && !w.inW) ? INSPECT_FEE : 0;
      h += `<div>
        <label class="opt"><input type="radio" name="dc_d" value="agree" onchange="decUI('${r.id}')"> <b>【同意維修】</b>（應付 ${money(r.quote.total)}）</label>
        <label class="opt"><input type="radio" name="dc_d" value="abandon" onchange="decUI('${r.id}')"> <b>【放棄維修】</b>${fee?`（過保仍需支付檢測費 ${money(fee)}）`:'（保固內，無需費用）'}</label>
      </div>
      <div id="dcPay"></div>
      <h4>取件方式</h4>
      <label class="opt"><input type="radio" name="dc_pk" value="north" onchange="decPkUI()"> 北部維修部門自取</label>
      <label class="opt"><input type="radio" name="dc_pk" value="office" onchange="decPkUI()"> 就近辦事處自取</label>
      <label class="opt"><input type="radio" name="dc_pk" value="courier" onchange="decPkUI()"> 貨運寄件</label>
      <div id="dcPkBox"></div>
      <div class="mt"><button class="btn green" onclick="submitDecision('${r.id}')">送出回覆</button></div>`;
    } else h += `<p class="note">等待「客戶／業務」回覆維修意願與付款。（請切換角色操作）</p>`;
    h += `</div>`;
  }

  if(r.decision){
    h += `<div class="sec"><h4>💳 客戶回覆（階段 5）</h4><div class="kv">
      <b>維修意願</b>${r.decision==='agree'?'同意維修':'放棄維修'}　<b>應付金額</b>${money(r.payAmount||0)}<br>
      <b>付款資訊</b>${payText(r.payment)}<br>
      <b>取件方式</b>${pickupText(r.pickup)}</div></div>`;
  }

  /* 階段 6：對帳 */
  if(r.status==='paid'){
    h += `<div class="sec"><h4>💰 財務對帳（階段 6）</h4>`;
    if(state.role==='finance'){
      h += `<div class="grid2">
        <div class="field"><span>核帳人員姓名 *</span><input id="fn_staff" placeholder="請輸入姓名" style="width:100%"></div>
        <div class="field"><span>發票開立日期</span><input type="date" id="fn_ivd" value="${todayISO()}" style="width:100%"></div>
        <div class="field"><span>發票號碼</span><input id="fn_ivn" placeholder="AB-12345678" style="width:100%"></div>
      </div>
      <label class="opt"><input type="checkbox" id="fn_ok"> <b>確認核帳</b>（金流已核對無誤）</label>
      <div class="mt"><button class="btn" onclick="doReconRepair('${r.id}')">完成對帳</button></div>
      <p class="note">發票隨物品一起交件。</p>`;
    } else h += `<p class="note">等待「核帳/財務人員」對帳確認。（請切換角色操作）</p>`;
    h += `</div>`;
  }
  if(r.account){
    h += `<div class="sec"><h4>🧾 核帳記錄</h4><div class="kv">
      <b>核帳人員</b>${esc(r.account.staff)}　<b>核帳時間</b>${fmtDT(r.account.ts)}<br>
      <b>發票</b>${r.account.ivn?`${fmtDate(r.account.ivd)}／${esc(r.account.ivn)}（隨物品交件）`:'未開立'}</div></div>`;
  }

  /* 階段 6：取件/寄送 */
  if(r.status==='reconciled'){
    h += `<div class="sec"><h4>📦 通知取件／寄出結案（階段 6）</h4>`;
    if(state.role==='receiver' || state.role==='tech'){
      if(r.pickup && r.pickup.method==='courier'){
        h += `<div class="grid2">
          <div class="field"><span>物流公司 *</span><input id="cl_cco" placeholder="如：黑貓宅急便" style="width:100%"></div>
          <div class="field"><span>物流單號 *</span><input id="cl_ctn" placeholder="單號" style="width:100%"></div>
        </div>
        <button class="btn green" onclick="closeRepair('${r.id}','courier')">寄出並自動結案（扣減庫存）</button>`;
      } else {
        h += `${r.notice?`<div class="okbox">已通知客戶可取件：${esc(r.notice.time)}／點交人員 ${esc(r.notice.staff)}</div>`:''}
        <div class="grid2">
          <div class="field"><span>可取件時間 *</span><input type="datetime-local" id="cl_time" style="width:100%" value="${r.notice?r.notice.raw:''}"></div>
          <div class="field"><span>點交人員姓名 *</span><input id="cl_staff" style="width:100%" value="${r.notice?esc(r.notice.staff):''}"></div>
        </div>
        <div class="flexrow">
          ${r.notice?'':`<button class="btn" onclick="sendPickupNotice('${r.id}')">通知客戶取件時間</button>`}
          <button class="btn green" onclick="closeRepair('${r.id}','pickup')">完成點交，結案（扣減庫存）</button>
        </div>`;
      }
    } else h += `<p class="note">等待「點收／維修人員」安排取件或寄出。取件方式：${pickupText(r.pickup)}</p>`;
    h += `</div>`;
  }
  if(r.status==='closed'){
    h += `<div class="sec"><div class="okbox"><b>✅ 已結案</b>　${fmtDT(r.closedAt)}<br>
      ${r.shipOut?`貨運寄出：${esc(r.shipOut.co)}／${esc(r.shipOut.no)}`:`點交完成：${esc(r.notice?r.notice.staff:'—')}${r.notice?'／'+esc(r.notice.time):''}`}
      ${r.decision==='agree'&&r.repair&&r.repair.parts.length?`<br>庫存已自動扣減：${r.repair.parts.map(p=>cat(p.id).name+'×'+p.qty).join('、')}（北部倉，流水帳含維修單號 ${r.id}）`:''}
    </div></div>`;
  }
  return h;
}

/* ============== 階段動作 ============== */
function doReceive(id){
  const r = state.repairs.find(x=>x.id===id);
  const date = $('rc_date').value, staff = $('rc_staff').value.trim();
  if(!date || !staff) return toast('請填寫收件日期與點收人員姓名');
  const missing = r.items.filter((_,i)=>!$('rc_it'+i).checked);
  if(missing.length) return toast('⚠️ 防呆：尚未逐項對點完成（'+missing.join('、')+'）');
  r.receive = { date, staff, checked:[...r.items] };
  r.status = 'received';
  notify(['tech'], `🔧 ${id} 已完成收件`, `點收人員 ${staff} 已完成對點，請進行拆機檢測。`, id);
  notify([r.byRole], `📦 ${id} 已收到您的物件`, `我們已於 ${fmtDate(date)} 完成收件點收，進入檢測程序。`, id);
  save(); toast('✅ 收件完成'); render(); refreshModal();
}

function workPrev(rid){
  const r = state.repairs.find(x=>x.id===rid);
  const w = warranty(r.shipDate), kind = kindOf(r.byRole);
  let total = w.inW ? 0 : INSPECT_FEE;
  CATALOG.filter(c=>c.repair).forEach(c=>{
    const cell = $('wc_'+c.id); if(!cell) return;
    const chk = $('wp_'+c.id);
    if(chk && chk.checked){
      const qty = Math.max(1, parseInt($('wq_'+c.id).value)||1);
      const human = w.inW ? ($('wh_'+c.id)?.checked||false) : true;
      const u = price(c.id, kind)||0;
      const charged = (w.inW && !human) ? 0 : u*qty;
      cell.innerHTML = charged===0 ? '<span class="badge b-green">$0 保固</span>' : money(charged);
      total += charged;
    } else cell.textContent = '—';
  });
  $('wtotal').textContent = '報價合計 ' + money(total);
}

function submitWork(rid){
  const r = state.repairs.find(x=>x.id===rid);
  const date = $('wk_date').value, staff = $('wk_staff').value.trim(), report = $('wk_report').value.trim();
  if(!date || !staff) return toast('請填寫維修日期與維修人員');
  if(!report) return toast('請填寫維修報告（將附在報價單上）');
  const w = warranty(r.shipDate), kind = kindOf(r.byRole);
  const parts = [], lines = [];
  CATALOG.filter(c=>c.repair).forEach(c=>{
    const chk = $('wp_'+c.id);
    if(chk && chk.checked){
      const qty = Math.max(1, parseInt($('wq_'+c.id).value)||1);
      const human = w.inW ? ($('wh_'+c.id)?.checked||false) : true;
      const u = price(c.id, kind)||0;
      const waived = w.inW && !human;
      parts.push({ id:c.id, qty, human, unit:u, charged: waived?0:u*qty });
      lines.push({ name:c.name, qty, unit:u, sub:u*qty, waived });
    }
  });
  const fee = w.inW ? 0 : INSPECT_FEE;
  const total = parts.reduce((t,p)=>t+p.charged,0) + fee;
  r.repair = { date, staff, parts, report,
    attachments:[...($('wk_file').files||[])].map(f=>f.name),
    internalNote: $('wk_note').value.trim() };
  r.quote = { lines, fee, total, sentAt:Date.now() };
  r.status = 'quoted';
  notify([r.byRole], `📄 ${rid} 報價單已發送（Email/LINE）`, `維修報價 ${money(total)}，請確認是否同意維修並回覆取件方式。`, rid);
  save(); toast('✅ 維修報告已提交，系統已自動發送報價單（階段 4）'); render(); refreshModal();
}

/* 階段 5 UI */
function decUI(rid){
  const r = state.repairs.find(x=>x.id===rid);
  const w = warranty(r.shipDate);
  const d = document.querySelector('input[name=dc_d]:checked')?.value;
  const amt = d==='agree' ? r.quote.total : ((w && !w.inW) ? INSPECT_FEE : 0);
  $('dcPay').innerHTML = amt>0 ? `<div class="infobox mt"><b>應付金額 ${money(amt)}</b>
    <div class="mt flexrow">
      <label class="opt"><input type="radio" name="dc_pm" value="linepay" checked onchange="decPayUI()"> LinePay QRcode</label>
      <label class="opt"><input type="radio" name="dc_pm" value="bank" onchange="decPayUI()"> 匯款帳號</label>
    </div>
    <div id="dcPmBox" class="mt flexrow">${QR_SVG}<div class="note">請掃描 QRcode 完成 LinePay 付款（Demo 示意）</div></div>
    <div class="grid2 mt">
      <div class="field"><span>付款日期 *</span><input type="date" id="dc_pd" value="${todayISO()}" style="width:100%"></div>
      <div class="field"><span id="dcRefLbl">LinePay 編號 *</span><input id="dc_ref" style="width:100%"></div>
      <div class="field"><span>上傳交易截圖</span><input type="file" id="dc_shot"></div>
    </div>
    <div class="field"><span>發票是否開立統編</span>
      <label class="opt"><input type="radio" name="dc_iv" value="n" checked onchange="$('dc_tax').style.display='none'"> 否</label>
      <label class="opt"><input type="radio" name="dc_iv" value="y" onchange="$('dc_tax').style.display='inline-block'"> 是</label>
      <input id="dc_tax" placeholder="統編號碼" style="display:none;width:140px">
    </div></div>` : `<div class="okbox mt">保固內免費／放棄免費：無需付款，直接選擇取件方式。</div>`;
}
function decPayUI(){
  const m = document.querySelector('input[name=dc_pm]:checked')?.value;
  $('dcPmBox').innerHTML = m==='linepay'
    ? `${QR_SVG}<div class="note">請掃描 QRcode 完成 LinePay 付款（Demo 示意）</div>`
    : `<div class="infobox">匯款帳號：808 玉山銀行　1234-567-890123<br><span class="note">戶名：寶傑股份有限公司</span></div>`;
  $('dcRefLbl').textContent = m==='linepay' ? 'LinePay 編號 *' : '轉帳後五碼 *';
}
function decPkUI(){
  const v = document.querySelector('input[name=dc_pk]:checked')?.value;
  let h = '';
  if(v==='north') h = `<div class="infobox">📍 ${OFFICES.north.name}：${OFFICES.north.addr}</div>`;
  if(v==='office') h = `<div class="infobox">
    <label class="opt"><input type="radio" name="dc_off" value="central" checked> ${OFFICES.central.name}（${OFFICES.central.addr}）</label>
    <label class="opt"><input type="radio" name="dc_off" value="south"> ${OFFICES.south.name}（${OFFICES.south.addr}）</label></div>`;
  if(v==='courier') h = `<div class="infobox">收件地址：<input id="dc_pkaddr" style="width:300px"></div>`;
  $('dcPkBox').innerHTML = h;
}
function submitDecision(rid){
  const r = state.repairs.find(x=>x.id===rid);
  const w = warranty(r.shipDate);
  const d = document.querySelector('input[name=dc_d]:checked')?.value;
  if(!d) return toast('請選擇【同意維修】或【放棄維修】');
  const pk = document.querySelector('input[name=dc_pk]:checked')?.value;
  if(!pk) return toast('請選擇取件方式');
  const pickup = { method:pk };
  if(pk==='office') pickup.office = document.querySelector('input[name=dc_off]:checked')?.value || 'central';
  if(pk==='courier'){ pickup.addr = $('dc_pkaddr').value.trim(); if(!pickup.addr) return toast('請填寫收件地址'); }
  const amt = d==='agree' ? r.quote.total : ((w && !w.inW) ? INSPECT_FEE : 0);
  r.decision = d; r.pickup = pickup; r.payAmount = amt;
  if(amt>0){
    const pm = document.querySelector('input[name=dc_pm]:checked')?.value || 'linepay';
    const ref = $('dc_ref').value.trim();
    if(!$('dc_pd').value || !ref) return toast('請回填付款日期與'+(pm==='linepay'?'LinePay 編號':'轉帳後五碼'));
    const ivNeed = document.querySelector('input[name=dc_iv]:checked')?.value==='y';
    if(ivNeed && !$('dc_tax').value.trim()) return toast('請填寫統編號碼');
    r.payment = { method:pm, date:$('dc_pd').value, ref,
      shot: $('dc_shot').files[0]?.name || '', invoice:{ need:ivNeed, taxId:$('dc_tax').value.trim() } };
    r.status = 'paid';
    notify(['finance'], `💰 ${rid} 已回填付款資訊`, `${d==='agree'?'同意維修':'放棄維修（檢測費）'} ${money(amt)}，請對帳確認。`, rid);
    toast('✅ 已送出，等待財務對帳');
  } else {
    r.status = 'reconciled';
    notify(['receiver','tech'], `📦 ${rid} 可安排取件／寄送`, `客戶已回覆（${d==='agree'?'同意維修':'放棄維修'}，免付款），請安排交件。`, rid);
    toast('✅ 已送出，等待安排取件');
  }
  save(); render(); refreshModal();
}

function doReconRepair(id){
  const r = state.repairs.find(x=>x.id===id);
  const staff = $('fn_staff').value.trim();
  if(!staff) return toast('請填寫核帳人員姓名');
  if(!$('fn_ok').checked) return toast('⚠️ 防呆：請勾選「確認核帳」');
  r.account = { staff, ts:Date.now(), ivd:$('fn_ivd').value, ivn:$('fn_ivn').value.trim() };
  r.status = 'reconciled';
  notify(['receiver','tech'], `📦 ${id} 對帳完成`, `請依取件方式安排：${pickupText(r.pickup)}`, id);
  notify([r.byRole], `✅ ${id} 對帳完成`, `款項已確認，將盡快安排${r.pickup.method==='courier'?'寄出':'取件'}。`, id);
  save(); toast('✅ 對帳完成'); render(); refreshModal();
}

function sendPickupNotice(id){
  const r = state.repairs.find(x=>x.id===id);
  const t = $('cl_time').value, staff = $('cl_staff').value.trim();
  if(!t || !staff) return toast('請填寫可取件時間與點交人員姓名');
  r.notice = { raw:t, time:t.replace('T',' '), staff };
  const place = r.pickup.method==='north' ? OFFICES.north : OFFICES[r.pickup.office];
  notify([r.byRole], `🔔 ${id} 可取件通知`, `請於 ${r.notice.time} 至 ${place.name}（${place.addr}）取件，點交人員：${staff}。發票隨物品交件。`, id);
  save(); toast('✅ 已通知客戶取件時間'); render(); refreshModal();
}

function closeRepair(id, mode){
  const r = state.repairs.find(x=>x.id===id);
  if(mode==='courier'){
    const co = $('cl_cco').value.trim(), no = $('cl_ctn').value.trim();
    if(!co || !no) return toast('請填寫物流公司與物流單號');
    r.shipOut = { co, no };
    notify([r.byRole], `🚚 ${id} 已寄出`, `${co}／${no}，維修單已結案。`, id);
  } else {
    const staff = ($('cl_staff')?.value||'').trim() || (r.notice?r.notice.staff:'');
    if(!staff) return toast('請填寫點交人員姓名');
    if(!r.notice){ const t = $('cl_time').value; if(t) r.notice = { raw:t, time:t.replace('T',' '), staff }; else r.notice = { raw:'', time:'現場點交', staff }; }
    r.notice.staff = staff;
    notify([r.byRole], `✅ ${id} 點交完成`, `維修單已結案，感謝您的支持。`, id);
  }
  /* 結案：正式扣減分倉庫存（同意維修才消耗零件） */
  if(r.decision==='agree' && r.repair){
    r.repair.parts.forEach(p=>{
      adjustPart(p.id, 'north', -p.qty, '維修消耗', r.repair.staff, r.id, '維修零件出庫');
    });
  }
  r.status = 'closed'; r.closedAt = Date.now();
  save(); toast('✅ ' + id + ' 已結案' + (r.decision==='agree'?'，庫存已自動扣減':'')); render(); refreshModal();
}
