// All in 1 Store — Client-side E-commerce SPA
const STORAGE_KEYS = {PRODUCTS:'ai_products_v3', CART:'ai_cart_v3', USER:'ai_user_v3', STATS:'ai_stats_v3', ACCOUNTS:'ai_accounts_v3'};
const ADMIN_CREDS = {email:'mario.kabreta@gmail.com', password:'2%txPg6DXN'};
const ADMIN_PHONE = '01069663958';
const GEMINI_API_KEY = 'AIzaSyA46PXI2lz4luZrv5hJZnT5wt096CF1Xjg';

const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

let products = load(STORAGE_KEYS.PRODUCTS) || [];
let cart = load(STORAGE_KEYS.CART) || [];
let user = load(STORAGE_KEYS.USER) || null;
let stats = load(STORAGE_KEYS.STATS) || {visits:0, orders:[], delivered:0};
let accounts = load(STORAGE_KEYS.ACCOUNTS) || [];
let adminLoggedIn = false;

function load(key){try{return JSON.parse(localStorage.getItem(key));}catch(e){return null}}
function save(key,val){localStorage.setItem(key,JSON.stringify(val));}

// UI message helpers — use the styled modals instead of browser alerts/confirms
function showMessage(title, msg, type='info'){ // type: info|success|error
  const modal = $('#message-modal');
  if(!modal) { alert(msg); return; }
  $('#message-modal-title').textContent = title || '';
  $('#message-modal-body').textContent = msg || '';
  modal.classList.remove('hidden');
  return new Promise((res)=>{
    const ok = $('#message-modal-ok');
    const onOk = ()=>{ modal.classList.add('hidden'); ok.removeEventListener('click', onOk); res(); };
    ok.addEventListener('click', onOk);
  });
}

function showConfirm(msg){
  const modal = $('#confirm-modal');
  if(!modal) return Promise.resolve(confirm(msg));
  $('#confirm-modal-body').textContent = msg||'';
  modal.classList.remove('hidden');
  return new Promise((resolve)=>{
    const yes = $('#confirm-yes');
    const no = $('#confirm-no');
    const cleanup = ()=>{ modal.classList.add('hidden'); yes.removeEventListener('click', onYes); no.removeEventListener('click', onNo); };
    const onYes = ()=>{ cleanup(); resolve(true); };
    const onNo = ()=>{ cleanup(); resolve(false); };
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
  });
}

// Increment visit
stats.visits = (stats.visits||0)+1; save(STORAGE_KEYS.STATS, stats);

// Render products with search/sort/filter
function renderProducts(filterTerm='', sortBy='newest'){
  const container = $('#products'); 
  container.innerHTML='';
  
  let filtered = products.filter(p=>p.name.toLowerCase().includes(filterTerm.toLowerCase()));
  
  if(sortBy==='price-low') filtered.sort((a,b)=>a.price-b.price);
  else if(sortBy==='price-high') filtered.sort((a,b)=>b.price-a.price);
  else if(sortBy==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  else filtered.sort((a,b)=>products.indexOf(b)-products.indexOf(a));
  
  if(filtered.length===0){ container.innerHTML='<p style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.5)">❌ لا توجد منتجات</p>'; return; }
  
  filtered.forEach(p=>{
    const tpl = document.getElementById('product-card').content.cloneNode(true);
    const badge = tpl.querySelector('.product-badge');
    if(p.discountPercent){ badge.textContent='🏷️ خصم '+p.discountPercent+'%'; badge.style.display='block'; }
    else if(p.freeShipping){ badge.textContent='🚚 شحن مجاني'; badge.style.display='block'; }
    
    tpl.querySelector('.product-img').src = p.mainImage || 'https://via.placeholder.com/400x300?text=Product';
    tpl.querySelector('.product-name').textContent = p.name;
    tpl.querySelector('.product-desc').textContent = p.description || 'منتج عالي الجودة';
    
    let priceText = p.price + ' ج.م';
    if(p.discountPercent){ priceText = (p.price * (1 - p.discountPercent/100)).toFixed(2) + ' ج.م'; }
    tpl.querySelector('.product-price').textContent = '💰 ' + priceText;
    
    const btn = tpl.querySelector('.add-to-cart'); 
    btn.onclick = (e)=>{ e.stopPropagation(); addToCart(p.id); };
    // open product detail modal when clicking the card (but not when clicking the add button)
    const article = tpl.querySelector('article') || tpl.firstElementChild;
    if(article) article.addEventListener('click', ()=> openProductModal(p.id));
    
    container.appendChild(tpl);
  });
}

function addToCart(id){
  const p = products.find(x=>x.id===id); 
  if(!p){ showMessage('خطأ','❌ منتج غير موجود','error'); return; }
  const existing = cart.find(i=>i.id===id);
  if(existing) existing.q++; 
  else cart.push({id, q:1});
  save(STORAGE_KEYS.CART, cart); 
  renderCart();
  // show toast
  showToast(`✅ ${p.name} تمت الإضافة إلى العربة`);
}

function renderCart(){
  document.getElementById('cart-count').textContent = cart.reduce((s,i)=>s+i.q,0);
  const id = 'cart-items'; const totalId = 'cart-total';
  const container = document.getElementById(id);
  if(!container) return;
  container.innerHTML='';
  let subtotal = 0;

  cart.forEach(item=>{
    const p = products.find(x=>x.id===item.id); 
    if(!p) return;
    const effectivePrice = p.discountPercent ? (p.price * (1 - p.discountPercent/100)) : p.price;
    const row = document.createElement('div'); 
    row.className='cart-row';
    row.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${p.mainImage||'https://via.placeholder.com/80'}" style="width:64px;height:48px;object-fit:cover;border-radius:6px"><div><div style="font-size:13px">${p.name}</div><div style="font-size:11px;color:rgba(255,255,255,0.6)">${effectivePrice.toFixed(2)} ج.م</div></div></div><div><input type='number' min='1' value='${item.q}' data-id='${item.id}' class='q-inp'></div><button class='btn-del' data-id='${item.id}' style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:16px">🗑️</button>`;
    container.appendChild(row);
    subtotal += effectivePrice * item.q;
  });

  // compute shipping based on selected region
  const region = (document.getElementById('shipping-region') && document.getElementById('shipping-region').value) || 'cairo';
  const shippingRates = {cairo:85, delta:90, saeed:95};
  const shippingFee = shippingRates[region] || 85;
  const grandTotal = subtotal + (cart.length>0 ? shippingFee : 0);

  document.getElementById(totalId).textContent = grandTotal.toFixed(2);

  // quantity change handlers
  $$(`#${id} .q-inp`).forEach(inp=>{ 
    inp.addEventListener('change', (e)=>{ 
      const itemId=e.target.dataset.id; 
      const it = cart.find(c=>c.id==itemId); 
      it.q = Math.max(1,parseInt(e.target.value)||1); 
      save(STORAGE_KEYS.CART, cart); 
      renderCart(); 
    }); 
  });
  // delete handlers
  $$(`#${id} .btn-del`).forEach(btn=>{ 
    btn.addEventListener('click', (e)=>{ 
      const itemId=e.target.dataset.id; 
      cart = cart.filter(c=>c.id!==itemId); 
      save(STORAGE_KEYS.CART, cart); 
      renderCart(); 
    }); 
  });
}

function checkout(){
  if(!user){ showMessage('تنبيه','❌ يرجى إنشاء حساب أو تسجيل الدخول أولاً','error').then(()=>{ openAccountModal(); }); return; }
  if(cart.length===0){ showMessage('تنبيه','❌ عربة التسوق فارغة','error'); return; }
  let subtotal = 0; 
  let lines=[];
  cart.forEach(item=>{ 
    const p = products.find(x=>x.id===item.id); 
    if(!p) return; 
    const effectivePrice = p.discountPercent ? (p.price * (1 - p.discountPercent/100)) : p.price;
    const linePrice = effectivePrice * item.q; 
    subtotal += linePrice; 
    lines.push(`📦 ${p.name} x ${item.q} = ${linePrice.toFixed(2)} ج.م`); 
  });
  // shipping
  const region = (document.getElementById('shipping-region') && document.getElementById('shipping-region').value) || 'cairo';
  const shippingRates = {cairo:85, delta:90, saeed:95};
  const shippingFee = cart.length>0 ? (shippingRates[region] || 85) : 0;
  const total = subtotal + shippingFee;
  lines.push('═══════════════════');
  lines.push('💰 المجموع: ' + subtotal.toFixed(2) + ' ج.م');
  lines.push('🚚 رسوم الشحن: ' + shippingFee.toFixed(2) + ' ج.م');
  lines.push('🔢 الإجمالي الكلي: ' + total.toFixed(2) + ' ج.م');

  const msg = `*🛍️ طلب جديد من All in 1 Store*\n\n*👤 البيانات:*\n📝 الاسم: ${user.name}\n📱 الهاتف: ${user.phone}\n📍 العنوان: ${user.address}\n\n*📦 المنتجات:*\n${lines.join('\n')}`;
  
  const phone = '201284731863';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  
  // Register order
  const order = {id:'ord_'+Date.now(), user, items:cart, total, status:'pending', created:Date.now()};
  stats.orders = stats.orders||[]; 
  stats.orders.push(order); 
  save(STORAGE_KEYS.STATS, stats);
  
  // Save account
  const existingAccount = accounts.find(a=>a.phone===user.phone);
  if(!existingAccount) { accounts.push({...user, created:Date.now()}); save(STORAGE_KEYS.ACCOUNTS, accounts); }
  
  cart = []; 
  save(STORAGE_KEYS.CART, cart); 
  renderCart(); 
  showSuccessModal(); 
  renderStats();
  
  // Close cart
  $('#cart-modal').classList.add('hidden');
}

function showSuccessModal(){ $('#success-modal').classList.remove('hidden'); }

// Simple toast helper
function showToast(text, opts={duration:2500}){
  const container = $('#toast-container');
  if(!container) return;
  const el = document.createElement('div'); el.className='toast success';
  el.innerHTML = `<span class="icon">✓</span><div style="flex:1">${text}</div>`;
  container.appendChild(el);
  setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),300); }, opts.duration);
}

// --- Product detail modal ---
function openProductModal(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  const modal = document.getElementById('product-modal'); if(!modal) return;
  document.getElementById('pm-title').textContent = p.name;
  document.getElementById('pm-main-image').src = p.mainImage || 'https://via.placeholder.com/600x400?text=Product';
  const thumbs = document.getElementById('pm-thumbs'); thumbs.innerHTML = '';
  const imgs = Array.isArray(p.images) && p.images.length ? p.images.slice() : [];
  if(p.mainImage) imgs.unshift(p.mainImage);
  imgs.forEach(src=>{
    const t = document.createElement('img'); t.src = src; t.style.cssText='width:72px;height:56px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid transparent';
    t.addEventListener('click', ()=>{ document.getElementById('pm-main-image').src = src; });
    thumbs.appendChild(t);
  });
  // price & description
  const effectivePrice = p.discountPercent ? (p.price * (1 - p.discountPercent/100)) : p.price;
  document.getElementById('pm-price').textContent = effectivePrice.toFixed(2) + ' ج.م';
  if(p.discountPercent){ document.getElementById('pm-old-price').style.display='block'; document.getElementById('pm-old-price').textContent = p.price.toFixed(2)+' ج.م'; }
  else document.getElementById('pm-old-price').style.display='none';
  document.getElementById('pm-desc').textContent = p.description || '';
  const details = [];
  if(p.colors) details.push('الألوان: '+p.colors);
  if(p.freeShipping) details.push('شحن: مجاني');
  if(p.discountPercent) details.push('خصم: '+p.discountPercent+'%');
  document.getElementById('pm-details').innerHTML = details.join('<br>') || '&nbsp;';
  // wire buttons
  const addBtn = document.getElementById('pm-add-to-cart');
  const buyBtn = document.getElementById('pm-buy-now');
  addBtn.onclick = ()=>{ addToCart(p.id); modal.classList.add('hidden'); };
  buyBtn.onclick = ()=>{ // quick buy: ensure user then open whatsapp for this single product
    if(!user){ showMessage('تنبيه','❌ يرجى إنشاء حساب أو تسجيل الدخول أولاً','error').then(()=>{ openAccountModal(); }); return; }
    const qty = 1;
    const effectivePrice = p.discountPercent ? (p.price * (1 - p.discountPercent/100)) : p.price;
    const total = (effectivePrice * qty);
    const msg = `*🛍️ طلب سريع من All in 1 Store*\n\n*👤 البيانات:*\n📝 الاسم: ${user.name}\n📱 الهاتف: ${user.phone}\n📍 العنوان: ${user.address}\n\n*📦 المنتج:*\n📦 ${p.name} x ${qty} = ${total.toFixed(2)} ج.م\n═══════════════════\n💰 الإجمالي: ${total.toFixed(2)} ج.م`;
    const phone = '201284731863';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
    modal.classList.add('hidden');
  };
  modal.classList.remove('hidden');
}

function closeProductModal(){ const m=document.getElementById('product-modal'); if(m) m.classList.add('hidden'); }

// Admin login
function openAdminLogin(){ $('#admin-login-modal').classList.remove('hidden'); }

function adminLogin(){
  const email = $('#admin-email').value.trim();
  const password = $('#admin-password').value.trim();
  
  if(email===ADMIN_CREDS.email && password===ADMIN_CREDS.password){
    adminLoggedIn = true;
    $('#admin-login-modal').classList.add('hidden');
    $('#admin-status').style.display='inline-block';
    $('#admin-panel').classList.remove('hidden');
    renderAdminProducts();
    renderStats();
    renderAccounts();
    $('#admin-email').value='';
    $('#admin-password').value='';
  } else {
    showMessage('خطأ','❌ البريد أو كلمة المرور خاطئة','error');
  }
}

function logoutAdmin(){
  showConfirm('❓ تسجيل خروج من الادمن؟').then(ok=>{
    if(!ok) return;
    adminLoggedIn = false;
    $('#admin-status').style.display='none';
    $('#admin-panel').classList.add('hidden');
  });
}

function renderAdminProducts(){
  const c = $('#admin-products'); 
  c.innerHTML='';
  
  products.forEach(p=>{
    const el = document.createElement('div'); 
    el.className='admin-product';
    el.innerHTML = `<img src='${p.mainImage||"https://via.placeholder.com/80"}'><div style='flex:1;min-width:150px'><strong style='font-size:13px'>${p.name}</strong><div style='font-size:11px;color:rgba(255,255,255,0.6)'>${p.price} ج.م ${p.discountPercent?(' - 🏷️ '+p.discountPercent+'%'):''} ${p.freeShipping?'- 🚚 مجاني':''}</div></div><div style='display:flex;flex-direction:column;gap:4px'><button class='btn small edit' data-id='${p.id}' style='padding:4px 8px;font-size:11px'>✏️ تعديل</button><button class='btn small del' data-id='${p.id}' style='padding:4px 8px;font-size:11px'>🗑️ حذف</button></div>`;
    c.appendChild(el);
  });
  
  $$('.admin-product .edit').forEach(b=>b.addEventListener('click', (e)=>{ openAdminProductModal('edit', e.target.dataset.id); }));
  $$('.admin-product .del').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; showConfirm('❓ حذف المنتج؟').then(ok=>{ if(!ok) return; products=products.filter(p=>p.id!==id); save(STORAGE_KEYS.PRODUCTS, products); renderProducts(); renderAdminProducts(); saveProductsShared(); }); }));
}

function editProductPrompt(id){
  const p = products.find(x=>x.id===id); 
  if(!p) return;
  
  const name = prompt('اسم المنتج', p.name); 
  if(name===null) return;
  p.name = name;
  p.price = parseFloat(prompt('السعر', p.price)||p.price);
  p.discountPercent = parseInt(prompt('نسبة الخصم (رقم)', p.discountPercent||0)||0) || 0;
  p.freeShipping = confirm('❓ هل شحن مجاني لهذا المنتج؟');
  p.description = prompt('الوصف', p.description||'')||p.description;
  p.mainImage = prompt('رابط الصورة الرئيسية', p.mainImage||'')||p.mainImage;
  
  save(STORAGE_KEYS.PRODUCTS, products); 
  renderProducts(); 
  renderAdminProducts();
}

function addProductPrompt(){
  // Open admin product modal for adding
  openAdminProductModal('add');
}

// Open admin product modal — mode: 'add' | 'edit', id when editing
function openAdminProductModal(mode, id){
  const modal = $('#admin-product-modal'); if(!modal) return;
  modal.dataset.mode = mode; modal.dataset.editId = id||'';
  // clear fields
  $('#ap-name').value=''; $('#ap-price').value=''; $('#ap-main').value=''; $('#ap-additional').value=''; $('#ap-colors').value=''; $('#ap-discount').value=''; $('#ap-free-shipping').checked=false; $('#ap-desc').value='';
  if(mode==='edit'){ const p = products.find(x=>x.id===id); if(!p) return; $('#ap-name').value=p.name||''; $('#ap-price').value=p.price||0; $('#ap-main').value=(p.mainImage||''); $('#ap-additional').value=(p.images||[]).join('|'); $('#ap-colors').value=p.colors||''; $('#ap-discount').value=p.discountPercent||0; $('#ap-free-shipping').checked=!!p.freeShipping; $('#ap-desc').value=p.description||''; }
  modal.classList.remove('hidden');
}

// Save product from modal
function saveAdminProductFromModal(){
  const modal = $('#admin-product-modal'); if(!modal) return;
  const mode = modal.dataset.mode;
  const editId = modal.dataset.editId;
  const name = $('#ap-name').value.trim();
  const price = parseFloat($('#ap-price').value) || 0;
  const main = $('#ap-main').value.trim();
  const additional = $('#ap-additional').value.trim();
  const colors = $('#ap-colors').value.trim();
  const discount = parseInt($('#ap-discount').value) || 0;
  const freeShipping = !!$('#ap-free-shipping').checked;
  const desc = $('#ap-desc').value.trim();
  if(!name){ showMessage('خطأ','❌ اسم المنتج مطلوب','error'); return; }
  if(mode==='add'){
    const id = 'p_'+Date.now();
    const imgs = additional?additional.split('|').map(s=>s.trim()).filter(Boolean):[];
    const mainImg = main && !/^https?:\/\//i.test(main) && !main.startsWith('/') ? `assets/products/${main}`:main;
    const imgsResolved = imgs.map(s=>(!/^https?:\/\//i.test(s) && !s.startsWith('/'))?`assets/products/${s}`:s);
    products.unshift({id,name,price,mainImage:mainImg,images:imgsResolved,colors,description:desc,discountPercent:discount,freeShipping});
  } else if(mode==='edit'){
    const p = products.find(x=>x.id===editId); if(!p) return; p.name=name; p.price=price; p.description=desc; p.discountPercent=discount; p.freeShipping=freeShipping; p.colors=colors; p.mainImage = main && !/^https?:\/\//i.test(main) && !main.startsWith('/') ? `assets/products/${main}`:main; p.images = additional?additional.split('|').map(s=>s.trim()).filter(Boolean).map(s=>(!/^https?:\/\//i.test(s) && !s.startsWith('/'))?`assets/products/${s}`:s):[];
  }
  save(STORAGE_KEYS.PRODUCTS, products); renderProducts(); renderAdminProducts(); modal.classList.add('hidden'); showMessage('نجاح','✅ تم حفظ المنتج','success');
  // Attempt to persist shared products: trigger download and try PUT to server
  saveProductsShared();
}

// Try to persist products for shared/public consumption.
function saveProductsShared(){
  try{
    const data = JSON.stringify(products, null, 2);
    // Trigger download (so admin can upload products.json to hosting)
    const blob = new Blob([data], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.json'; a.click();
    // Best-effort attempt to PUT to the same origin (works only if server allows PUT to static file)
    fetch('products.json', {method:'PUT', headers:{'Content-Type':'application/json'}, body:data}).catch(()=>{/*silent*/});
  }catch(e){ console.warn('saveProductsShared failed', e); }
}

// Persist users (download users.json and try PUT to server)
function saveUsersShared(){
  try{
    const data = JSON.stringify(accounts, null, 2);
    const blob = new Blob([data], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.json'; a.click();
    fetch('users.json', {method:'PUT', headers:{'Content-Type':'application/json'}, body:data}).catch(()=>{/*silent*/});
  }catch(e){ console.warn('saveUsersShared failed', e); }
}

// --- Download / dirty state helpers for products.json ---
let __lastExportedProductsJSON = null;

function downloadProductsJsonFile(){
  try{
    const data = JSON.stringify(products, null, 2);
    const blob = new Blob([data], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.json'; document.body.appendChild(a); a.click(); a.remove();
    // mark as exported
    __lastExportedProductsJSON = data;
    updateDownloadButtonVisibility();
  }catch(e){ console.warn('downloadProductsJsonFile failed', e); }
}

function updateDownloadButtonVisibility(){
  try{
    const btn = document.getElementById('download-json-btn') || document.getElementById('export-products-json');
    if(!btn) return;
    const cur = JSON.stringify(products, null, 2);
    if(!__lastExportedProductsJSON) {
      // if we haven't set baseline yet, use loadedProducts (if present) or consider current as baseline
      __lastExportedProductsJSON = window.__loadedProductsJSON || cur;
    }
    if(cur !== __lastExportedProductsJSON){
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  }catch(e){/*silent*/}
}

// periodic check to detect changes made by admin UI (simple and robust)
setInterval(updateDownloadButtonVisibility, 800);

// wire buttons after DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  const dbtn = document.getElementById('download-json-btn');
  if(dbtn) dbtn.addEventListener('click', downloadProductsJsonFile);
  const expJson = document.getElementById('export-products-json');
  if(expJson) expJson.addEventListener('click', downloadProductsJsonFile);
  // initialize visibility
  updateDownloadButtonVisibility();
});

function cancelAdminProductModal(){
  $('#admin-product-modal').classList.add('hidden');
}

function importFile(file){
  const reader = new FileReader();
  reader.onload = function(e){
    const data = e.target.result;
    const wb = XLSX.read(data, {type:'binary'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, {defval: ''});
    
    json.forEach((row, idx)=>{
      const id = 'p_'+Date.now() + Math.floor(Math.random()*10000) + '_' + idx;
      const rawMain = row['mainImage'] || row['الصورة الأساسية'] || row['MainImage'] || '';
      const mainImg = rawMain && !/^https?:\/\//i.test(rawMain) && !rawMain.startsWith('/') ? `assets/products/${rawMain}` : rawMain;
      const rawAdd = (row['additionalImages']||row['صور اضافية']||'').toString();
      const imgs = rawAdd.split('|').map(s=>s.trim()).filter(Boolean).map(s=>(!/^https?:\/\//i.test(s) && !s.startsWith('/'))?`assets/products/${s}`:s);
      const p = {
        id,
        name: row['name'] || row['اسم المنتج'] || row['Name'] || 'بدون اسم',
        mainImage: mainImg,
        images: imgs,
        price: parseFloat(row['price']||row['السعر']||0)||0,
        colors: row['colors']||row['الالوان']||'',
        description: row['description']||row['الوصف']||''
      };
      products.push(p);
    });
    
    save(STORAGE_KEYS.PRODUCTS, products); 
    renderProducts(); 
    renderAdminProducts();
    showMessage('نجاح', '✅ تم استيراد '+json.length+' منتج بنجاح', 'success');
    saveProductsShared();
  };
  reader.readAsBinaryString(file);
}

function exportProducts(){
  const csv = ['name,mainImage,price,colors,description'];
  products.forEach(p=>{
    csv.push(`"${p.name}","${p.mainImage}",${p.price},"${p.colors}","${p.description.replace(/"/g,'""')}"`);
  });
  const blob = new Blob([csv.join('\n')], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products_'+Date.now()+'.csv';
  a.click();
}

async function generateDescriptionForSelected(){
  const key = $('#gemini-key').value.trim() || GEMINI_API_KEY;
  if(!products.length){ showMessage('تنبيه','❌ لا يوجد منتجات','error'); return; }
  
  const p = products[0];
  const prompt = `اكتب وصفًا جذابًا باللغة العربية للمنتج:\nاسم: ${p.name}\nمواصفات: ${p.description||'لا توجد'}\nالألوان: ${p.colors||'متعددة'}\nاكتب 2-3 جمل قصيرة.`;
  
  try{
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({contents:[{parts:[{text:prompt}]}]})
    });
    if(!resp.ok) throw new Error('API failed');
    const data = await resp.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم الحصول على وصف';
    p.description = out; 
    save(STORAGE_KEYS.PRODUCTS, products); 
    renderProducts(); 
    renderAdminProducts(); 
    showMessage('نجاح','✅ تم توليد الوصف عبر Gemini','success');
  }catch(err){
    console.warn(err); 
    const fallback = fallbackDescription(p); 
    p.description=fallback; 
    save(STORAGE_KEYS.PRODUCTS, products); 
    renderProducts(); 
    renderAdminProducts(); 
    showMessage('تحذير','⚠️ فشل الاتصال بـ Gemini. تم استخدام مولد احتياطي محلي.','error');
  }
}

function fallbackDescription(p){ 
  return `اشتري ${p.name} الآن — تصميم أنيق وجودة عالية. ${p.colors?('متوفر بـ '+p.colors+'. '):''}السعر الآن: ${p.price} ج.م فقط! 🎁`; 
}

// Account modal
function openAccountModal(){ 
  $('#account-modal').classList.remove('hidden'); 
  if(user){ 
    $('#user-name').value=user.name||''; 
    $('#user-email').value=user.email||'';
    $('#user-phone').value=user.phone||''; 
    $('#user-address').value=user.address||''; 
    $('#user-password').value='';
  } 
}

function saveAccount(){ 
  const name = $('#user-name').value.trim(); 
  const email = $('#user-email').value.trim();
  const phone=$('#user-phone').value.trim(); 
  const password = $('#user-password').value.trim();
  const address=$('#user-address').value.trim(); 
  if(!name||!phone||!address||!email||!password){ showMessage('تحذير','❌ جميع الحقول مطلوبة','error'); return; } 
  user={name,email,phone,address}; 
  save(STORAGE_KEYS.USER,user); 
  // Also persist to accounts (for login)
  const existing = accounts.find(a=>a.email===email);
  if(!existing) { accounts.push({name,email,phone,address,password,created:Date.now()}); save(STORAGE_KEYS.ACCOUNTS, accounts); }
  $('#account-modal').classList.add('hidden'); 
  updateUserProfile();
  showMessage('نجاح','✅ تم حفظ بيانات حسابك بنجاح','success'); 
  // If signup was for admin account, activate admin UI
  if(email === ADMIN_CREDS.email && phone === ADMIN_PHONE){ adminLoggedIn = true; const adm = $('#admin-status'); if(adm) adm.style.display='inline-block'; const ap = $('#admin-panel'); if(ap) ap.classList.remove('hidden'); renderAdminProducts(); renderStats(); renderAccounts(); }
  // Try to persist users.json (download + try PUT)
  saveUsersShared();
}

function updateUserProfile(){
  if(user){
    $('#user-profile-btn').style.display='inline-block';
    $('#user-profile-name').textContent = user.name;
    // Hide signup/login when a user is signed in
    const openAccount = $('#open-account'); if(openAccount) openAccount.style.display='none';
    const openLogin = $('#open-login'); if(openLogin) openLogin.style.display='none';
    // If this user is admin (email AND phone match), enable admin controls
    if(user.email && user.email === ADMIN_CREDS.email && user.phone && user.phone === ADMIN_PHONE){ adminLoggedIn = true; $('#admin-status').style.display='inline-block'; $('#admin-panel').classList.remove('hidden'); renderAdminProducts(); renderStats(); renderAccounts(); } else { adminLoggedIn = false; }
  } else {
    $('#user-profile-btn').style.display='none';
    const openAccount = $('#open-account'); if(openAccount) openAccount.style.display='inline-block';
    const openLogin = $('#open-login'); if(openLogin) openLogin.style.display='inline-block';
    // hide admin UI when no user
    adminLoggedIn = false; const adm = $('#admin-status'); if(adm) adm.style.display='none'; const ap = $('#admin-panel'); if(ap) ap.classList.add('hidden');
  }
}

function openUserProfile(){
  if(!user) return;
  $('#profile-name').textContent = user.name;
  $('#profile-phone').textContent = user.phone;
  $('#profile-address').textContent = user.address;
  $('#user-profile-modal').classList.remove('hidden');
}

function logoutUser(){
  showConfirm('❓ تسجيل خروج من حسابك؟').then(ok=>{
    if(!ok) return;
    user = null;
    save(STORAGE_KEYS.USER, user);
    updateUserProfile();
    $('#user-profile-modal').classList.add('hidden');
    cart = [];
    save(STORAGE_KEYS.CART, cart);
    renderCart();
    showMessage('تم','✅ تم تسجيل الخروج بنجاح','success');
  });
}

function renderStats(){
  const s = load(STORAGE_KEYS.STATS) || {visits:0,orders:[]};
  const pending = (s.orders||[]).filter(o=>o.status==='pending').length;
  const delivered = (s.orders||[]).filter(o=>o.status==='delivered').length;
  
  const container = $('#stats'); 
  container.innerHTML = `
    <div class='stat'><strong>👁️ الزيارات:</strong><div style='font-size:18px;color:#06b6d4'>${s.visits||0}</div></div>
    <div class='stat'><strong>📦 الطلبات الإجمالية:</strong><div style='font-size:18px;color:#06b6d4'>${(s.orders||[]).length}</div></div>
    <div class='stat'><strong>✅ المسلمة:</strong><div style='font-size:18px;color:#06b6d4'>${delivered}</div></div>
    <div class='stat'><strong>⏳ قيد التسليم:</strong><div style='font-size:18px;color:#06b6d4'>${pending}</div></div>
  `;
}

function renderAccounts(){
  const container = $('#accounts-list'); 
  container.innerHTML='';
  if(accounts.length===0){ container.innerHTML='<p style="color:rgba(255,255,255,0.5)">ℹ️ لا توجد حسابات مسجلة</p>'; return; }
  
  accounts.forEach(acc=>{
    const el = document.createElement('div');
    el.style.cssText='background:rgba(255,255,255,0.02);padding:10px;border-radius:6px;margin-bottom:8px;font-size:12px;border:1px solid rgba(255,255,255,0.05)';
    el.innerHTML = `<strong>👤 ${acc.name}</strong><br>📱 ${acc.phone}<br>📍 ${acc.address}`;
    container.appendChild(el);
  });
}

// Login handler
function loginUser(){
  const email = $('#login-email').value.trim();
  const phone = $('#login-phone').value.trim();
  const password = $('#login-password').value.trim();
  if(!email||!phone||!password){ showMessage('تحذير','❌ جميع الحقول مطلوبة لتسجيل الدخول','error'); return; }
  // Allow admin login (check email, password, AND phone)
  if(email === ADMIN_CREDS.email && password === ADMIN_CREDS.password && phone === ADMIN_PHONE){
    // admin login
    user = {name:'Administrator', email:ADMIN_CREDS.email, phone:ADMIN_PHONE, address:''};
    adminLoggedIn = true;
    $('#admin-status').style.display='inline-block';
    $('#admin-panel').classList.remove('hidden');
    renderAdminProducts(); renderStats(); renderAccounts();
  } else {
    const acc = accounts.find(a=>a.email===email && a.password===password && a.phone===phone);
    if(!acc){ showMessage('خطأ','❌ بيانات الدخول غير صحيحة','error'); return; }
    user = {name:acc.name,email:acc.email,phone:acc.phone,address:acc.address};
  }
  save(STORAGE_KEYS.USER, user);
  updateUserProfile();
  $('#login-modal').classList.add('hidden');
  showMessage('نجاح','✅ تم تسجيل الدخول بنجاح','success');
}

// UI Events
window.addEventListener('load', ()=>{
  // Try to load shared products from products.json (if hosted)
  fetch('products.json').then(r=>{ if(r.ok) return r.json(); throw new Error('no shared products'); }).then(shared=>{
    if(Array.isArray(shared) && shared.length>0){ products = shared; save(STORAGE_KEYS.PRODUCTS, products); }
  }).catch(()=>{
    // ignore — use localStorage
  }).catch(()=>{/*ignore*/}).finally(()=>{});

  // Try to load shared users from users.json (if hosted)
  fetch('users.json').then(r=>{ if(r.ok) return r.json(); throw new Error('no shared users'); }).then(sharedUsers=>{
    if(Array.isArray(sharedUsers) && sharedUsers.length>0){ accounts = sharedUsers; save(STORAGE_KEYS.ACCOUNTS, accounts); }
  }).catch(()=>{/*ignore*/}).finally(()=>{
    // Render UI after attempting both loads (products/users)
    renderProducts(); 
    renderCart(); 
    renderStats();
    updateUserProfile();
  });
  // If there's an existing logged-in user who is admin (email AND phone match), enable admin UI
  if(user && user.email && user.email === ADMIN_CREDS.email && user.phone && user.phone === ADMIN_PHONE){ adminLoggedIn = true; const adm = $('#admin-status'); if(adm) adm.style.display='inline-block'; const ap = $('#admin-panel'); if(ap) ap.classList.remove('hidden'); renderAdminProducts(); renderStats(); renderAccounts(); }
  
  // Cart (use modal)
  $('#open-cart').addEventListener('click', ()=>{ $('#cart-modal').classList.toggle('hidden'); });
  $('#close-cart-modal').addEventListener('click', ()=>{ $('#cart-modal').classList.add('hidden'); });
  $('#clear-cart-btn').addEventListener('click', ()=>{ showConfirm('❓ مسح العربة؟').then(ok=>{ if(!ok) return; cart=[]; save(STORAGE_KEYS.CART, cart); renderCart(); }); });
  $('#checkout-btn').addEventListener('click', checkout);
  
  // Admin
  $('#admin-status').addEventListener('click', logoutAdmin);
  
  // Account
  $('#open-account').addEventListener('click', openAccountModal);
  // Login button in header
  const openLoginBtn = $('#open-login');
  if(openLoginBtn) openLoginBtn.addEventListener('click', ()=>{ $('#login-modal').classList.remove('hidden'); });
  $('#login-btn').addEventListener('click', loginUser);
  $('#close-login').addEventListener('click', ()=>$('#login-modal').classList.add('hidden'));
  $('#save-account').addEventListener('click', saveAccount);
  $('#close-account').addEventListener('click', ()=>$('#account-modal').classList.add('hidden'));
  
  $('#user-profile-btn').addEventListener('click', openUserProfile);
  $('#logout-user').addEventListener('click', logoutUser);
  $('#close-profile').addEventListener('click', ()=>$('#user-profile-modal').classList.add('hidden'));
  
  $('#close-success').addEventListener('click', ()=>$('#success-modal').classList.add('hidden'));
  
  // Admin login
  $('#admin-login-btn').addEventListener('click', adminLogin);
  $('#close-admin-login').addEventListener('click', ()=>$('#admin-login-modal').classList.add('hidden'));
  $('#admin-email').addEventListener('keypress', (e)=>{ if(e.key==='Enter') adminLogin(); });
  $('#admin-password').addEventListener('keypress', (e)=>{ if(e.key==='Enter') adminLogin(); });
  
  // Admin functions
  $('#add-product').addEventListener('click', addProductPrompt);
  $('#import-excel').addEventListener('click', ()=>{ const f=$('#excel-file').files[0]; if(!f) { showMessage('تنبيه','❌ اختر ملف','error'); return; } importFile(f); });
  $('#export-products').addEventListener('click', exportProducts);
  $('#logout-admin').addEventListener('click', logoutAdmin);
  $('#generate-desc').addEventListener('click', generateDescriptionForSelected);
  // admin product modal buttons
  const apSave = $('#ap-save'); if(apSave) apSave.addEventListener('click', saveAdminProductFromModal);
  const apCancel = $('#ap-cancel'); if(apCancel) apCancel.addEventListener('click', cancelAdminProductModal);
  // export JSON
  const expJson = $('#export-products-json'); if(expJson) expJson.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(products, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='products_'+Date.now()+'.json'; a.click();
  });
  
  // Search & Sort
  $('#search-input').addEventListener('input', (e)=>{ renderProducts(e.target.value, $('#sort-select').value); });
  $('#sort-select').addEventListener('change', (e)=>{ renderProducts($('#search-input').value, e.target.value); });

  // product modal close
  const pmClose = document.getElementById('pm-close'); if(pmClose) pmClose.addEventListener('click', closeProductModal);
  // shipping region change should update cart totals
  const shipSel = document.getElementById('shipping-region'); if(shipSel) shipSel.addEventListener('change', ()=>{ renderCart(); });
  
  // Admin status button: open admin panel when admin, otherwise open admin login
  const adminStatusBtn = $('#admin-status');
  if(adminStatusBtn){
    adminStatusBtn.addEventListener('click', ()=>{
      if(adminLoggedIn){ const ap = $('#admin-panel'); if(ap) ap.classList.remove('hidden'); }
      else openAdminLogin();
    });
  }
  
  // Check if admin status button should show login
  const checkAdminAccess = ()=>{
    const adminBtn = $('#admin-status');
    if(!adminLoggedIn && adminBtn) adminBtn.style.display='none';
  };
  document.addEventListener('click', (e)=>{
    if(e.target.id === 'admin-status' && !adminLoggedIn) openAdminLogin();
  });
});

// Listen for add admin button click (if clicking the header area without specific button)
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey || e.metaKey) && e.key === '\\') openAdminLogin(); // Ctrl+\ to open admin
});
