/* ============== 販售單詳情 ============== */
function saleDeliveryText(d){
  if(d.method==='pickup') return `${OFFICES[d.office].name}自取（${OFFICES[d.office].addr}）`;
  return `${esc(d.shipVia)}寄件（收件地址：${esc(d.addr)}，運費 ${money(SHIP_FEE)}）`;
}
function saleDetailHTML(s){
  const [stTxt, stCls] = SSTATUS[s.status];
  const isOrderer = ['customer','sales'].includes(state.role);
  let h = `<h3>販售訂單 ${s.id} <span class="badge ${stCls}">${stTxt}</span></h3>
  ${stepperHTML(SSTEPS, SDONE[s.status])}
  <div class="sec"><h4>🛒 訂單內容（步驟 1）</h4><div class="kv">
    <b>購買人</b>${esc(s.buyer.name)}／${esc(s.buyer.phone)}（${ROLES[s.byRole]}）　<b>下單時間</b>${fmtDT(s.createdAt)}<br>
    <b>取件方式</b>${saleDeliveryText(s.delivery)}</div>
  <table><thead><tr><th>品項</th><th>下單時狀態</th><th>單價</th><th>數量</th><th class="right">小計</th></tr></thead><tbody>
    ${s.items.map(i=>`<tr><td>${cat(i.id).name}</td><td>${i.front==='預購'?'<span class="badge b-amber">預購</span>':'<span class="badge b-green">現貨</span>'}</td><td>${money(i.unit)}</td><td>${i.qty}</td><td class="right">${money(i.unit*i.qty)}</td></tr>`).join('')}
    ${s.shipFee?`<tr><td colspan="4">運費（貨運/郵局）</td><td class="right">${money(s.shipFee)}</td></tr>`:''}
    <tr><td colspan="4"><b>總計</b></td><td class="right"><b>${money(s.total)}</b></td></tr>
  </tbody></table></div>`;

  /* 步驟 2：付款 */
  if(s.status==='pending_payment'){
    h += `<div class="sec"><h4>💳 完成付款（步驟 2）</h4>`;
    if(isOrderer){
      h += `<div class="infobox"><b>應付金額 ${money(s.total)}</b>
      <div class="mt flexrow">
        <label class="opt"><input type="radio" name="sp_pm" value="linepay" checked onchange="spPayUI()"> LinePay QRcode</label>
        <label class="opt"><input type="radio" name="sp_pm" value="bank" onchange="spPayUI()"> 匯款帳號</label>
      </div>
      <div id="spPmBox" class="mt flexrow">${QR_SVG}<div class="note">請掃描 QRcode 完成 LinePay 付款（Demo 示意）</div></div>
      <div class="grid2 mt">
        <div class="field"><span>付款日期 *</span><input type="date" id="sp_pd" value="${todayISO()}" style="width:100%"></div>
        <div class="field"><span id="spRefLbl">LinePay 編號 *</span><input id="sp_ref" style="width:100%"></div>
        <div class="field"><span>上傳交易截圖</span><input type="file" id="sp_shot"></div>
      </div>
      <div class="field"><span>發票是否開立統編</span>
        <label class="opt"><input type="radio" name="sp_iv" value="n" checked onchange="$('sp_tax').style.display='none'"> 否</label>
        <label class="opt"><input type="radio" name="sp_iv" value="y" onchange="$('sp_tax').style.display='inline-block'"> 是</label>
        <input id="sp_tax" placeholder="統編號碼" style="display:none;width:140px">
      </div>
      <button class="btn green" onclick="paySale('${s.id}')">回填付款資訊</button></div>`;
    } else h += `<p class="note">等待「客戶／業務」完成付款。（請切換角色操作）</p>`;
    h += `</div>`;
  }
  if(s.payment){
    h += `<div class="sec"><h4>💳 付款資訊（步驟 2）</h4><div class="kv">${payText(s.payment)}</div></div>`;
  }

  /* 步驟 3：對帳 */
  if(s.status==='pending_recon'){
    h += `<div class="sec"><h4>💰 對帳確認（步驟 3）</h4>`;
    if(state.role==='finance'){
      h += `<div class="grid2">
        <div class="field"><span>核帳人員姓名 *</span><input id="sf_staff" style="width:100%"></div>
        <div class="field"><span>發票開立日期</span><input type="date" id="sf_ivd" value="${todayISO()}" style="width:100%"></div>
        <div class="field"><span>發票號碼</span><input id="sf_ivn" placeholder="AB-12345678" style="width:100%"></div>
      </div>
      <label class="opt"><input type="checkbox" id="sf_ok"> <b>確認核帳</b>（金流已核對無誤）</label>
      <div class="mt"><button class="btn" onclick="doReconSale('${s.id}')">完成對帳</button></div>`;
    } else h += `<p class="note">等待「核帳/財務人員」對帳。（請切換角色操作）</p>`;
    h += `</div>`;
  }
  if(s.account){
    h += `<div class="sec"><h4>🧾 核帳記錄</h4><div class="kv"><b>核帳人員</b>${esc(s.account.staff)}　<b>時間</b>${fmtDT(s.account.ts)}　<b>發票</b>${s.account.ivn?fmtDate(s.account.ivd)+'／'+esc(s.account.ivn):'未開立'}</div></div>`;
  }

  /* 步驟 4：控存收單備貨 */
  const hasPre = s.items.some(i=>frontStatus(i.id)==='預購' || i.front==='預購');
  if(s.status==='pending_stock'){
    h += `<div class="sec"><h4>📦 收單／預購審查（步驟 4）</h4>`;
    if(state.role==='stock'){
      h += hasPre ? `<div class="warnbox">⚠️ 本訂單含<b>預購</b>商品，請判斷是否補貨或向其它區域辦事處調貨後再確認收單。</div>` : `<div class="okbox">本訂單皆為現貨，庫存充足。</div>`;
      h += `<table><thead><tr><th>品項</th><th>需求</th><th>北部</th><th>中部</th><th>南部</th><th>前台狀態</th></tr></thead><tbody>
      ${s.items.map(i=>{
        const e = state.inv.parts[i.id];
        return `<tr><td>${cat(i.id).name}</td><td>${i.qty}</td>
          ${WHS.map(w=>`<td class="${e[w].q<=e[w].s?'low':''}">${e[w].q}<span class="note">/安${e[w].s}</span></td>`).join('')}
          <td>${fsBadge(i.id)}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="grid2 mt">
        <div class="field"><span>控存人員姓名 *</span><input id="sr_staff" style="width:100%"></div>
        <div class="field"><span>庫存處置</span><select id="sr_act" style="width:100%">
          <option>庫存足夠，直接出貨</option><option>已安排補貨（向廠商進貨）</option>
          <option>已向中部辦事處調貨</option><option>已向南部辦事處調貨</option></select></div>
      </div>
      ${s.delivery.method==='ship' ? `<div class="grid2">
        <div class="field"><span>物流公司 *</span><input id="sr_cco" value="${esc(s.delivery.shipVia)}" style="width:100%"></div>
        <div class="field"><span>物流單號 *</span><input id="sr_ctn" style="width:100%"></div></div>`
      : `<div class="field"><span>可取件時間 *</span><input type="datetime-local" id="sr_time" style="width:100%"></div>`}
      <button class="btn green" onclick="doStockReview('${s.id}')">確認收單，備貨完成（扣庫存＋自動通知）</button>`;
    } else h += `<p class="note">等待「控存人員」收單備貨。（請切換角色操作）</p>`;
    h += `</div>`;
  }
  if(s.review){
    h += `<div class="sec"><h4>📦 備貨記錄（步驟 4-5）</h4><div class="kv">
      <b>控存人員</b>${esc(s.review.staff)}　<b>處置</b>${esc(s.review.act)}　<b>時間</b>${fmtDT(s.review.ts)}<br>
      ${s.shipOut?`<b>寄件</b>${esc(s.shipOut.co)}／${esc(s.shipOut.no)}`:`<b>可取件時間</b>${esc(s.pickupTime||'—')}`}<br>
      <b>庫存</b>已自動扣減（見異動記錄，含訂單編號 ${s.id}）</div></div>`;
  }
  if(s.status==='ready'){
    h += `<div class="sec"><div class="okbox">✅ 備貨完成，系統已自動發送${s.delivery.method==='ship'?'寄件':'自取'}通知。</div>
    ${state.role==='stock'?`<button class="btn" onclick="closeSale('${s.id}')">交件完成，結案</button>`:''}</div>`;
  }
  if(s.status==='closed'){
    h += `<div class="sec"><div class="okbox"><b>✅ 已結案</b>　${fmtDT(s.closedAt)}</div></div>`;
  }
  return h;
}

function spPayUI(){
  const m = document.querySelector('input[name=sp_pm]:checked')?.value;
  $('spPmBox').innerHTML = m==='linepay'
    ? `${QR_SVG}<div class="note">請掃描 QRcode 完成 LinePay 付款（Demo 示意）</div>`
    : `<div class="infobox">匯款帳號：808 玉山銀行　1234-567-890123<br><span class="note">戶名：寶傑股份有限公司</span></div>`;
  $('spRefLbl').textContent = m==='linepay' ? 'LinePay 編號 *' : '轉帳後五碼 *';
}
function paySale(id){
  const s = state.sales.find(x=>x.id===id);
  const pm = document.querySelector('input[name=sp_pm]:checked')?.value || 'linepay';
  const ref = $('sp_ref').value.trim();
  if(!$('sp_pd').value || !ref) return toast('請回填付款日期與'+(pm==='linepay'?'LinePay 編號':'轉帳後五碼'));
  const ivNeed = document.querySelector('input[name=sp_iv]:checked')?.value==='y';
  if(ivNeed && !$('sp_tax').value.trim()) return toast('請填寫統編號碼');
  s.payment = { method:pm, date:$('sp_pd').value, ref, shot:$('sp_shot').files[0]?.name||'', invoice:{ need:ivNeed, taxId:$('sp_tax').value.trim() } };
  s.status = 'pending_recon';
  notify(['finance'], `💰 ${id} 已回填付款資訊`, `販售訂單 ${money(s.total)}，請對帳確認。`, id);
  save(); toast('✅ 付款資訊已送出，等待財務對帳'); render(); refreshModal();
}
function doReconSale(id){
  const s = state.sales.find(x=>x.id===id);
  const staff = $('sf_staff').value.trim();
  if(!staff) return toast('請填寫核帳人員姓名');
  if(!$('sf_ok').checked) return toast('⚠️ 防呆：請勾選「確認核帳」');
  s.account = { staff, ts:Date.now(), ivd:$('sf_ivd').value, ivn:$('sf_ivn').value.trim() };
  s.status = 'pending_stock';
  const hasPre = s.items.some(i=>frontStatus(i.id)==='預購' || i.front==='預購');
  notify(['stock'], `📦 ${id} 對帳完成，請收單備貨`, hasPre?'⚠️ 本單含預購商品，請判斷補貨或跨區調撥。':'商品皆為現貨，請撿貨打包。', id);
  save(); toast('✅ 對帳完成，已通知控存收單'); render(); refreshModal();
}
function doStockReview(id){
  const s = state.sales.find(x=>x.id===id);
  const staff = $('sr_staff').value.trim();
  if(!staff) return toast('請填寫控存人員姓名');
  if(s.delivery.method==='ship'){
    const co = $('sr_cco').value.trim(), no = $('sr_ctn').value.trim();
    if(!co || !no) return toast('請填寫物流公司與物流單號');
    s.shipOut = { co, no };
  } else {
    const t = $('sr_time').value;
    if(!t) return toast('請填寫可取件時間');
    s.pickupTime = t.replace('T',' ');
  }
  s.review = { staff, act:$('sr_act').value, ts:Date.now() };
  /* 扣庫存：自取扣該辦事處倉，寄件扣北部倉 */
  const wh = s.delivery.method==='pickup' ? s.delivery.office : 'north';
  s.items.forEach(i=> adjustPart(i.id, wh, -i.qty, '販售出貨', staff, s.id, '配件販售'));
  s.status = 'ready';
  if(s.delivery.method==='ship'){
    notify([s.byRole], `🚚 ${id} 已寄出（備貨完成）`, `${s.shipOut.co}／${s.shipOut.no}，請留意收件。`, id);
  } else {
    const o = OFFICES[s.delivery.office];
    notify([s.byRole], `🔔 ${id} 備貨完成可取件`, `請於 ${s.pickupTime} 至 ${o.name}（${o.addr}）取件。`, id);
  }
  save(); toast('✅ 備貨完成，庫存已扣減並自動通知客戶'); render(); refreshModal();
}
function closeSale(id){
  const s = state.sales.find(x=>x.id===id);
  s.status = 'closed'; s.closedAt = Date.now();
  notify([s.byRole], `✅ ${id} 已結案`, '感謝您的購買。', id);
  save(); toast('✅ ' + id + ' 已結案'); render(); refreshModal();
}
