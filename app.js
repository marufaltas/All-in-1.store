// All in 1 Store — Client-side E-commerce SPA
const STORAGE_KEYS = {PRODUCTS:'ai_products_v3', CART:'ai_cart_v3', USER:'ai_user_v3', STATS:'ai_stats_v3', ACCOUNTS:'ai_accounts_v3'};
const STORAGE_KEYS_COUPONS = 'ai_coupons_v1';
let coupons = load(STORAGE_KEYS_COUPONS) || [];
const STORAGE_KEYS_REVIEWS = 'ai_reviews_v1';
let reviews = load(STORAGE_KEYS_REVIEWS) || [];

function saveCoupon(coupon){
  // coupon: {code, type, value, category, expires, usageLimit, usedCount, active}
  const idx = coupons.findIndex(c=>c.code===coupon.code);
  if(idx>-1) coupons[idx]=coupon;
  else coupons.push(coupon);
  save(STORAGE_KEYS_COUPONS, coupons);
}

function deleteCoupon(code){
  coupons = coupons.filter(c=>c.code!==code);
  save(STORAGE_KEYS_COUPONS, coupons);
}

function getValidCoupon(code, cart){
  const now = Date.now();
  const c = coupons.find(c=>c.code.toLowerCase()===code.toLowerCase() && c.active!==false && (!c.expires || now < c.expires) && (!c.usageLimit || (c.usedCount||0)<c.usageLimit));
  if(!c) return null;
  // category check
  if(c.category && cart && !cart.some(item=>{
    const p = products.find(x=>x.id===item.id);
    return p && p.category===c.category;
  })) return null;
  return c;
}

function openCouponsModal(){
  const modal = document.getElementById('coupons-modal') || $('#coupons-modal');
  if(!modal) return;
  modal.classList.remove('hidden');
  renderCouponsList();
}

function renderCouponsList(){
  const list = $('#coupons-list');
  if(!list) return;
  list.innerHTML = '';
  if(coupons.length===0){ list.innerHTML='<p style="color:rgba(255,255,255,0.5)">📭 لا توجد كوبونات</p>'; return; }
  coupons.forEach(c=>{
    const expires = c.expires ? new Date(c.expires).toLocaleDateString('ar-EG') : 'بدون حد';
    const el = document.createElement('div');
    el.style.cssText='background:rgba(255,255,255,0.03);padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;font-size:12px';
    el.innerHTML=`<div><strong>${c.code}</strong> - ${c.type==='percent'?c.value+'%':c.value+' ج.م'} (${c.category||'كل الفئات'})</div><div style="display:flex;gap:6px"><button class="btn small" style="padding:4px 8px" onclick="editCoupon('${c.code}')">✏️</button><button class="btn small" style="padding:4px 8px;background:#ef4444" onclick="deleteCoupon('${c.code}')">🗑️</button></div>`;
    list.appendChild(el);
  });
}

function editCoupon(code){
  const c = coupons.find(x=>x.code===code);
  if(!c) return;
  $('#coupon-code').value = c.code;
  $('#coupon-type').value = c.type;
  $('#coupon-value').value = c.value;
  $('#coupon-category').value = c.category || '';
  $('#coupon-expires').value = c.expires ? new Date(c.expires).toISOString().split('T')[0] : '';
  $('#coupon-usage').value = c.usageLimit || '';
  $('#coupon-active').checked = c.active!==false;
}

function saveCouponModal(){
  const code = $('#coupon-code').value.trim().toUpperCase();
  const type = $('#coupon-type').value;
  const value = parseFloat($('#coupon-value').value);
  const category = $('#coupon-category').value || '';
  const expires = $('#coupon-expires').value ? new Date($('#coupon-expires').value).getTime() : null;
  const usageLimit = parseInt($('#coupon-usage').value) || null;
  const active = $('#coupon-active').checked;
  if(!code || !value || value<0){ showMessage('خطأ','❌ بيانات ناقصة أو غير صحيحة','error'); return; }
  const newCoupon = {code, type, value, category, expires, usageLimit, usedCount:0, active};
  saveCoupon(newCoupon);
  showMessage('نجاح','✅ تم حفظ الكوبون بنجاح','success');
  $('#coupon-code').value=''; $('#coupon-value').value=''; $('#coupon-expires').value=''; $('#coupon-usage').value='';
  renderCouponsList();
}

function applyCouponCode(code){
  if(!user){ showMessage('تنبيه','❌ يرجى تسجيل الدخول أولاً','error'); return; }
  const coupon = getValidCoupon(code, cart);
  if(!coupon){ showMessage('خطأ','❌ الكوبون غير صحيح أو انتهى','error'); return; }
  localStorage.setItem('applied_coupon', code);
  renderCart();
  showMessage('نجاح','✅ تم تطبيق الخصم بنجاح!','success');
}

// --- Reviews & Ratings ---
function saveReview(productId, rating, comment, userName){
  const review = {id:'rev_'+Date.now(), productId, rating, comment, userName, date:Date.now()};
  reviews.push(review);
  save(STORAGE_KEYS_REVIEWS, reviews);
  renderProduct(productId);
}

function deleteReview(reviewId){
  reviews = reviews.filter(r=>r.id!==reviewId);
  save(STORAGE_KEYS_REVIEWS, reviews);
}

function getProductReviews(productId){
  return reviews.filter(r=>r.productId===productId).sort((a,b)=>b.date-a.date);
}

function getProductRating(productId){
  const prodReviews = getProductReviews(productId);
  if(!prodReviews.length) return 0;
  return (prodReviews.reduce((s,r)=>s+r.rating,0)/prodReviews.length).toFixed(1);
}

function renderProduct(productId){ renderProducts(); }
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
function renderProducts(filterTerm='', sortBy='newest', category=''){
  const container = $('#products'); 
  container.innerHTML='';
  
  let filtered = products.filter(p=>{
    const matchSearch = p.name.toLowerCase().includes(filterTerm.toLowerCase());
    const matchCategory = !category || (p.category === category);
    return matchSearch && matchCategory;
  });
  
  if(sortBy==='price-low') filtered.sort((a,b)=>a.price-b.price);
  else if(sortBy==='price-high') filtered.sort((a,b)=>b.price-a.price);
  else if(sortBy==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  else filtered.sort((a,b)=>products.indexOf(b)-products.indexOf(a));
  
  if(filtered.length===0){ container.innerHTML='<p style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.5)">❌ لا توجد منتجات</p>'; return; }
  
  filtered.forEach(p=>{
    const tpl = document.getElementById('product-card').content.cloneNode(true);
    const badge = tpl.querySelector('.product-badge');
    if(p.isTrending){ badge.textContent='⭐ مميز'; badge.style.display='block'; }
    else if(p.discountPercent){ badge.textContent='🏷️ خصم '+p.discountPercent+'%'; badge.style.display='block'; }
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

function getCartCouponCode(){
  const inp = document.getElementById('coupon-input');
  return inp ? inp.value.trim() : '';
}

function removeCoupon(){
  localStorage.removeItem('applied_coupon');
  const inp = document.getElementById('coupon-input');
  if(inp) inp.value = '';
  renderCart();
  showToast('✅ تم إزالة الخصم');
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
    let priceDisplay = effectivePrice.toFixed(2) + ' ج.م';
    row.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${p.mainImage||'https://via.placeholder.com/80'}" style="width:64px;height:48px;object-fit:cover;border-radius:6px"><div><div style="font-size:13px">${p.name}</div><div style="font-size:11px;color:rgba(255,255,255,0.6)">${priceDisplay}</div></div></div><div><input type='number' min='1' value='${item.q}' data-id='${item.id}' class='q-inp'></div><button class='btn-del' data-id='${item.id}' style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:16px">🗑️</button>`;
    container.appendChild(row);
    subtotal += (p.freeShipping ? 0 : effectivePrice) * item.q;
  });

  // Apply coupon discount
  const appliedCoupon = localStorage.getItem('applied_coupon');
  const coupon = appliedCoupon ? getValidCoupon(appliedCoupon, cart) : null;
  let discountAmount = 0;
  if(coupon){
    if(coupon.type==='percent') discountAmount = subtotal * (coupon.value/100);
    else discountAmount = Math.min(coupon.value, subtotal);
    subtotal = Math.max(0, subtotal - discountAmount);
  }
  
  // Show coupon display
  const couponDisplay = document.getElementById('coupon-display');
  if(couponDisplay){
    if(coupon){
      couponDisplay.style.display='block';
      couponDisplay.innerHTML=`✅ تم تطبيق الخصم: <strong>${coupon.code}</strong> (-${discountAmount.toFixed(2)} ج.م) <button style="background:none;border:none;color:#ff6b6b;cursor:pointer;float:left;padding:0" onclick="removeCoupon()">✕</button>`;
    } else {
      couponDisplay.style.display='none';
    }
  }

  // compute shipping based on selected region
  const region = (document.getElementById('shipping-region') && document.getElementById('shipping-region').value) || 'cairo';
  const shippingRates = {cairo:85, delta:90, saeed:95};
  const hasAllFreeShipping = cart.every(item=>{ const p = products.find(x=>x.id===item.id); return p && p.freeShipping; });
  const shippingFee = (cart.length>0 && !hasAllFreeShipping) ? (shippingRates[region] || 85) : 0;
  const grandTotal = subtotal + shippingFee;

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
  const hasAllFreeShipping = cart.every(item=>{ const p = products.find(x=>x.id===item.id); return p && p.freeShipping; });
  const shippingFee = (cart.length>0 && !hasAllFreeShipping) ? (shippingRates[region] || 85) : 0;
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

// --- Welcome popup for new accounts ---
function showWelcomePopup(name){
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content glass" style="max-width:480px;text-align:center;padding:32px 24px;animation:slideIn 0.4s ease-out">
    <button onclick="this.closest('.modal').remove()" class="btn-close" style="position:absolute;top:12px;left:12px">✕</button>
    <div style="font-size:48px;margin-top:12px">🎉👋</div>
    <h2 style="color:#06b6d4;margin:16px 0;font-size:28px">أهلاً وسهلاً، ${name}!</h2>
    <p style="color:rgba(255,255,255,0.85);line-height:1.6;margin:12px 0">نرحب بك في <strong>All in 1 Store</strong> 🛍️</p>
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:16px 0">استمتع بتجربة التسوق الرائعة مع أفضل المنتجات وأسعار منافسة! ✨</p>
    <div style="margin:20px 0;padding:12px;background:rgba(124,58,237,0.1);border-radius:8px;font-size:12px;color:rgba(255,255,255,0.7)">مع تحياتي:<br><strong>Dr. Mario Faltas</strong> 👨‍💼</div>
  </div>`;
  document.body.appendChild(modal);
  modal.classList.remove('hidden');
  setTimeout(()=>{ if(modal.parentNode) modal.remove(); }, 5000);
}

// --- Product detail modal ---
function openProductModal(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  window.currentProductId = p.id;
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
  if(p.discountPercent && !p.freeShipping){ document.getElementById('pm-old-price').style.display='block'; document.getElementById('pm-old-price').textContent = p.price.toFixed(2)+' ج.م'; }
  else document.getElementById('pm-old-price').style.display='none';
  document.getElementById('pm-desc').textContent = p.description || '';
  const details = [];
  if(p.colors) details.push('الألوان: '+p.colors);
  if(p.freeShipping) details.push('توصيل: مجاني في جميع أنحاء مصر');
  if(p.discountPercent) details.push('خصم: '+p.discountPercent+'%');
  if(p.isTrending) details.push('⭐ منتج مميز');
  document.getElementById('pm-details').innerHTML = details.join('<br>') || '&nbsp;';
  
  // Display ratings
  const rating = getProductRating(p.id);
  const prodReviews = getProductReviews(p.id);
  document.getElementById('pm-rating-count').textContent = prodReviews.length;
  document.getElementById('pm-rating-display').innerHTML = rating > 0 ? ('⭐ '.repeat(Math.round(rating)) + ` (${rating})`) : '🚫 لا توجد تقييمات بعد';
  
  // Render reviews
  const reviewsList = document.getElementById('pm-reviews-list');
  reviewsList.innerHTML = '';
  prodReviews.forEach(r=>{
    const el = document.createElement('div');
    el.style.cssText='background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;border-left:3px solid #fbbf24;font-size:12px';
    el.innerHTML=`<div style="display:flex;justify-content:space-between"><strong>${r.userName}</strong><span>${new Date(r.date).toLocaleDateString('ar-EG')}</span></div><div style="color:#fbbf24">${'⭐'.repeat(r.rating)}</div><div style="color:rgba(255,255,255,0.7);margin-top:4px">${r.comment}</div>${adminLoggedIn?`<button style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:10px;margin-top:4px" onclick="deleteReview('${r.id}'); openProductModal('${p.id}')">🗑️ حذف</button>`:''}`;
    reviewsList.appendChild(el);
  });
  
  // Reset review form
  document.getElementById('review-comment').value='';
  document.querySelectorAll('.star-btn').forEach(b=>b.textContent='☆');
  document.getElementById('selected-rating').textContent='0';
  window.selectedRating = 0;
  
  // wire buttons
  const addBtn = document.getElementById('pm-add-to-cart');
  const buyBtn = document.getElementById('pm-buy-now');
  addBtn.onclick = ()=>{ addToCart(p.id); modal.classList.add('hidden'); };
  buyBtn.onclick = ()=>{ // quick buy
    if(!user){ showMessage('تنبيه','❌ يرجى إنشاء حساب أو تسجيل الدخول أولاً','error').then(()=>{ openAccountModal(); }); return; }
    const qty = 1;
    const productPrice = effectivePrice * qty;
    const shippingFee = p.freeShipping ? 0 : 85;
    const total = productPrice + shippingFee;
    const msg = `*🛍️ طلب سريع من All in 1 Store*\n\n*👤 البيانات:*\n📝 الاسم: ${user.name}\n📱 الهاتف: ${user.phone}\n📍 العنوان: ${user.address}\n\n*📦 المنتج:*\n📦 ${p.name} x ${qty} = ${productPrice.toFixed(2)} ج.م\n${shippingFee > 0 ? `🚚 الشحن: ${shippingFee.toFixed(2)} ج.م` : `🚚 شحن مجاني`}\n═══════════════════\n💰 الإجمالي: ${total.toFixed(2)} ج.م`;
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
    // ensure social settings button is available only for admin
    ensureSocialSettingsButton();
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
    // remove social settings button when admin logs out
    const ss = document.getElementById('social-settings-btn'); if(ss) ss.remove();
  });
}

// --- Settings for social media posting ---
function openSocialMediaSettings(){
  const modal = document.createElement('div'); modal.className='modal';
  const fbId = localStorage.getItem('fb_page_id') || '';
  const fbToken = localStorage.getItem('fb_page_token') || '';
  const tgToken = localStorage.getItem('tg_bot_token') || '';
  const tgChat = localStorage.getItem('tg_chat_id') || '';
  const igToken = localStorage.getItem('ig_token') || '';
  
  modal.innerHTML = `
    <div class="modal-content glass" style="max-width:600px;padding:20px;animation:slideIn 0.25s">
      <button onclick="this.closest('.modal').remove()" class="btn-close" style="position:absolute;right:12px;top:12px">✕</button>
      <h3 style="color:#06b6d4;margin-bottom:16px">⚙️ إعدادات وسائل التواصل</h3>
      
      <div style="margin-bottom:16px;padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;border-left:3px solid #ef4444">
        <strong style="color:#fca5a5">⚠️ تحذير أمان</strong>
        <p style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:8px">البيانات تُحفظ محلياً في متصفحك. لا تشاركها مع أحد. استخدم رموز منفصلة (page tokens وليس حسابك الشخصي).</p>
      </div>
      
      <h4 style="color:#a78bfa;margin-top:16px;margin-bottom:8px">📱 فيسبوك</h4>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="sms-fb-id" type="text" placeholder="Page ID" value="${fbId}" style="flex:1;padding:8px;border-radius:6px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.05)">
      </div>
      <textarea id="sms-fb-token" placeholder="Page Access Token" style="width:100%;min-height:60px;padding:8px;border-radius:6px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.05);margin-bottom:8px;font-size:11px;font-family:monospace">${fbToken}</textarea>
      <a href="https://developers.facebook.com/docs/facebook-login/access-tokens#page-access-tokens" target="_blank" style="font-size:11px;color:#06b6d4;text-decoration:underline">📖 كيفية الحصول على Page Access Token</a>
      
      <h4 style="color:#60a5fa;margin-top:16px;margin-bottom:8px">✈️ تيليجرام</h4>
      <input id="sms-tg-token" type="text" placeholder="Bot Token (من @BotFather)" value="${tgToken}" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(96,165,250,0.3);background:rgba(96,165,250,0.05);margin-bottom:8px;font-family:monospace">
      <input id="sms-tg-chat" type="text" placeholder="Chat ID أو اسم القناة (@channel)" value="${tgChat}" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(96,165,250,0.3);background:rgba(96,165,250,0.05);margin-bottom:8px;font-family:monospace">
      <a href="https://core.telegram.org/bots#botfather" target="_blank" style="font-size:11px;color:#06b6d4;text-decoration:underline">📖 إنشاء Telegram Bot</a>
      
      <h4 style="color:#ec4899;margin-top:16px;margin-bottom:8px">📸 إنستجرام</h4>
      <textarea id="sms-ig-token" placeholder="Instagram Graph API Token (اختياري)" style="width:100%;min-height:50px;padding:8px;border-radius:6px;border:1px solid rgba(236,72,153,0.3);background:rgba(236,72,153,0.05);font-size:11px;font-family:monospace">${igToken}</textarea>
      <p style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:8px">ملاحظة: النشر على إنستجرام يحتاج متطلبات معقدة، يمكن استخدام fallback للمشاركة اليدوية.</p>
      
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button id="sms-clear" class="btn" style="background:#ef4444">🗑️ حذف الكل</button>
        <button id="sms-save" class="btn primary">💾 حفظ</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.querySelector('#sms-save').addEventListener('click', ()=>{
    localStorage.setItem('fb_page_id', modal.querySelector('#sms-fb-id').value.trim());
    localStorage.setItem('fb_page_token', modal.querySelector('#sms-fb-token').value.trim());
    localStorage.setItem('tg_bot_token', modal.querySelector('#sms-tg-token').value.trim());
    localStorage.setItem('tg_chat_id', modal.querySelector('#sms-tg-chat').value.trim());
    localStorage.setItem('ig_token', modal.querySelector('#sms-ig-token').value.trim());
    showMessage('نجاح','✅ تم حفظ بيانات الاعتماد','success');
    modal.remove();
  });
  
  modal.querySelector('#sms-clear').addEventListener('click', ()=>{
    showConfirm('❓ حذف جميع البيانات المحفوظة؟').then(ok=>{
      if(!ok) return;
      localStorage.removeItem('fb_page_id');
      localStorage.removeItem('fb_page_token');
      localStorage.removeItem('tg_bot_token');
      localStorage.removeItem('tg_chat_id');
      localStorage.removeItem('ig_token');
      showMessage('تم','✅ تم حذف البيانات','success');
      modal.remove();
    });
  });
}

function renderAdminProducts(){
  const c = $('#admin-products'); 
  c.innerHTML='';
  
  products.forEach(p=>{
    const el = document.createElement('div'); 
    el.className='admin-product';
    el.innerHTML = `<img src='${p.mainImage||"https://via.placeholder.com/80"}'><div style='flex:1;min-width:150px'><strong style='font-size:13px'>${p.name}</strong><div style='font-size:11px;color:rgba(255,255,255,0.6)'>${p.price} ج.م ${p.discountPercent?(' - 🏷️ '+p.discountPercent+'%'):''} ${p.freeShipping?'- 🚚 مجاني':''}</div><div style='font-size:10px;color:rgba(124,58,237,0.9)'>📂 ${p.category||'الكترونيات'}</div></div><div style='display:flex;flex-direction:column;gap:6px'><button class='btn small edit' data-id='${p.id}' style='padding:6px 8px;font-size:11px'>✏️ تعديل</button><button class='btn small del' data-id='${p.id}' style='padding:6px 8px;font-size:11px'>🗑️ حذف</button><button class='btn small post-fb' data-id='${p.id}' style='padding:6px 8px;font-size:11px;background:#1877f2;color:#fff'>📣 فيس</button><button class='btn small post-tg' data-id='${p.id}' style='padding:6px 8px;font-size:11px;background:#2ca5e0;color:#fff'>✈️ تيليج</button><button class='btn small post-ig' data-id='${p.id}' style='padding:6px 8px;font-size:11px;background:#e4405f;color:#fff'>📸 إنستا</button></div>`;
    c.appendChild(el);
  });
  
  $$('.admin-product .edit').forEach(b=>b.addEventListener('click', (e)=>{ openAdminProductModal('edit', e.target.dataset.id); }));
  $$('.admin-product .del').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; showConfirm('❓ حذف المنتج؟').then(ok=>{ if(!ok) return; products=products.filter(p=>p.id!==id); save(STORAGE_KEYS.PRODUCTS, products); renderProducts(); renderAdminProducts(); saveProductsShared(); }); }));
  // Publish to social handlers
  $$('.admin-product .post-fb').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; openPublishModal('facebook', id); }));
  $$('.admin-product .post-tg').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; openPublishModal('telegram', id); }));
  $$('.admin-product .post-ig').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; openPublishModal('instagram', id); }));
}

// --- Social publish helpers ---
function openPublishModal(provider, productId){
  const p = products.find(x=>x.id===productId);
  if(!p) return showMessage('خطأ','❌ المنتج غير موجود للنشر','error');
  // Build modal content (simple, dynamic)
  const modal = document.createElement('div'); modal.className='modal';
  const images = (p.images && p.images.length) ? p.images.slice() : [];
  if(p.mainImage) images.unshift(p.mainImage);
  const imgsHtml = images.map(src=>`<img src="${src}" style="width:80px;height:60px;object-fit:cover;margin-right:6px;border-radius:6px">`).join('');
  const providerNames = {facebook:'فيسبوك', telegram:'تيليجرام', instagram:'إنستجرام'};
  const providerName = providerNames[provider] || provider;
  modal.innerHTML = `
    <div class="modal-content glass" style="max-width:680px;padding:18px 16px;animation:slideIn 0.25s">
      <button onclick="this.closest('.modal').remove()" class="btn-close" style="position:absolute;left:12px;top:12px">✕</button>
      <h3 style="margin:6px 0;color:#06b6d4">📤 نشر على ${providerName}</h3>
      <div style="display:flex;gap:12px;align-items:center;margin:8px 0;overflow-x:auto">${imgsHtml}</div>
      <textarea id="sp-text" style="width:100%;min-height:100px;padding:8px;border-radius:8px;margin-top:8px;font-family:sans-serif">${p.description||p.name}</textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
        <button id="sp-open-fallback" class="btn">📲 مشاركة يدوية</button>
        <button id="sp-publish" class="btn primary">✈️ نشر الآن</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // handlers
  modal.querySelector('#sp-open-fallback').addEventListener('click', ()=>{
    const txt = modal.querySelector('#sp-text').value;
    if(provider==='facebook') openFacebookShareFallback(p, txt);
    else if(provider==='telegram') openTelegramShareFallback(p, txt);
    else if(provider==='instagram') openInstagramShareFallback(p, txt);
  });
  modal.querySelector('#sp-publish').addEventListener('click', async ()=>{
    const txt = modal.querySelector('#sp-text').value;
    try{
      if(provider==='facebook') await postToFacebook(productId, txt);
      else if(provider==='telegram') await postToTelegram(productId, txt);
      else if(provider==='instagram') await postToInstagram(productId, txt);
    }catch(err){
      console.warn(err);
      showMessage('خطأ', (err.message || err.toString()), 'error');
    }
    modal.remove();
  });
}

async function postToFacebook(productId, caption){
  const p = products.find(x=>x.id===productId); if(!p) throw new Error('منتج غير موجود');
  const pageId = localStorage.getItem('fb_page_id');
  const pageToken = localStorage.getItem('fb_page_token');
  if(!pageId || !pageToken) throw new Error('❌ لم تُحفظ بيانات فيسبوك. اذهب إلى الإعدادات وأدخل Page ID و Page Access Token');
  const imageUrl = (p.mainImage) ? p.mainImage : (p.images && p.images[0]) || '';
  if(!imageUrl) throw new Error('❌ المنتج لا يحتوي على صورة. أضف صورة قبل النشر.');
  const url = `https://graph.facebook.com/v18.0/${pageId}/photos`;
  try{
    const form = new URLSearchParams();
    form.append('url', imageUrl);
    form.append('caption', caption);
    form.append('access_token', pageToken);
    const resp = await fetch(url, { method: 'POST', body: form });
    const data = await resp.json();
    if(!resp.ok || data.error) throw new Error(data.error ? `${data.error.code}: ${data.error.message}` : 'FB API error');
    showMessage('نجاح','✅ تم النشر على فيسبوك بنجاح! 🎉','success');
  }catch(err){
    console.warn('FB publish failed', err);
    if(err.message.includes('CORS') || err.message.includes('Network')){
      showMessage('خطأ في الاتصال','⚠️ حدث خطأ CORS أو شبكة. افتح المشاركة من متصفح بديل أو استخدم نافذة المشاركة.','error').then(()=> openFacebookShareFallback(p, caption));
    } else {
      throw err;
    }
  }
}

function openFacebookShareFallback(p, caption){
  // Facebook share dialog accepts URL and quote — we will try to share the product mainImage URL as the URL
  // If you have a product public page/link, put it in product.url; otherwise share image URL
  const shareUrl = p.url || p.mainImage || location.href;
  const dialog = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(caption)}`;
  window.open(dialog,'_blank');
}

async function postToTelegram(productId, caption){
  const p = products.find(x=>x.id===productId); if(!p) throw new Error('منتج غير موجود');
  const botToken = localStorage.getItem('tg_bot_token');
  const chatId = localStorage.getItem('tg_chat_id');
  if(!botToken || !chatId) throw new Error('❌ لم تُحفظ بيانات تيليجرام. اذهب إلى الإعدادات وأدخل Bot Token و Chat ID');
  const imageUrl = (p.mainImage) ? p.mainImage : (p.images && p.images[0]) || '';
  if(!imageUrl) throw new Error('❌ المنتج لا يحتوي على صورة. أضف صورة قبل النشر.');
  const api = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  try{
    const form = new URLSearchParams();
    form.append('chat_id', chatId);
    form.append('photo', imageUrl);
    form.append('caption', caption);
    const resp = await fetch(api, { method: 'POST', body: form });
    const data = await resp.json();
    if(!resp.ok || !data.ok) throw new Error(data.description || 'Telegram API error');
    showMessage('نجاح','✅ تم النشر على تيليجرام بنجاح! 🎉','success');
  }catch(err){
    console.warn('TG publish failed', err);
    if(err.message.includes('CORS') || err.message.includes('Network')){
      showMessage('خطأ في الاتصال','⚠️ حدث خطأ في الاتصال. استخدم نافذة المشاركة البديلة.','error').then(()=> openTelegramShareFallback(p, caption));
    } else {
      throw err;
    }
  }
}

function openTelegramShareFallback(p, caption){
  const shareUrl = p.url || p.mainImage || location.href;
  const dialog = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`;
  window.open(dialog,'_blank');
}

async function postToInstagram(productId, caption){
  // Instagram Graph API is complex and requires Business Account setup
  // For now, we'll use a simpler fallback approach
  const p = products.find(x=>x.id===productId); if(!p) throw new Error('منتج غير موجود');
  const igToken = localStorage.getItem('ig_token');
  if(!igToken){
    // No token saved — use fallback
    return openInstagramShareFallback(p, caption);
  }
  // Instagram Graph API requires Business Account and specific setup
  // This is a placeholder for potential Instagram API integration
  // For most users, fallback to share dialog is recommended
  showMessage('ملاحظة','إنستجرام يحتاج إعداد معقد. سيتم فتح نافذة المشاركة البديلة.','info').then(()=> openInstagramShareFallback(p, caption));
}

function openInstagramShareFallback(p, caption){
  // Instagram doesn't have a direct share URL like Facebook/Telegram
  // We'll open Instagram and suggest manual posting
  const message = `📱 قم بنسخ المعلومات التالية ونشرها على إنستجرام:\n\n${caption}\n\n🔗 ${p.url || p.mainImage || location.href}`;
  showMessage('قم بالنشر يدويًا', message, 'info').then(()=>{
    // Open Instagram in new tab
    window.open('https://www.instagram.com/', '_blank');
  });
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
  $('#ap-name').value=''; $('#ap-price').value=''; $('#ap-main').value=''; $('#ap-additional').value=''; $('#ap-colors').value=''; $('#ap-discount').value=''; $('#ap-free-shipping').checked=false; $('#ap-trending').checked=false; $('#ap-desc').value=''; $('#ap-category').value='الكترونيات';
  if(mode==='edit'){ const p = products.find(x=>x.id===id); if(!p) return; $('#ap-name').value=p.name||''; $('#ap-price').value=p.price||0; $('#ap-main').value=(p.mainImage||''); $('#ap-additional').value=(p.images||[]).join('|'); $('#ap-colors').value=p.colors||''; $('#ap-discount').value=p.discountPercent||0; $('#ap-free-shipping').checked=!!p.freeShipping; $('#ap-trending').checked=!!p.isTrending; $('#ap-desc').value=p.description||''; $('#ap-category').value=p.category||'الكترونيات'; }
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
  const isTrending = !!$('#ap-trending').checked;
  const desc = $('#ap-desc').value.trim();
  const category = $('#ap-category').value || 'الكترونيات';
  if(mode==='add'){
    const id = 'p_'+Date.now();
    const imgs = additional?additional.split('|').map(s=>s.trim()).filter(Boolean):[];
    const mainImg = main && !/^https?:\/\//i.test(main) && !main.startsWith('/') ? `assets/products/${main}`:main;
    const imgsResolved = imgs.map(s=>(!/^https?:\/\//i.test(s) && !s.startsWith('/'))?`assets/products/${s}`:s);
    products.unshift({id,name,price,mainImage:mainImg,images:imgsResolved,colors,category,description:desc,discountPercent:discount,freeShipping,isTrending});
  } else if(mode==='edit'){
    const p = products.find(x=>x.id===editId); if(!p) return; p.name=name; p.price=price; p.description=desc; p.discountPercent=discount; p.freeShipping=freeShipping; p.isTrending=isTrending; p.colors=colors; p.category=category; p.mainImage = main && !/^https?:\/\//i.test(main) && !main.startsWith('/') ? `assets/products/${main}`:main; p.images = additional?additional.split('|').map(s=>s.trim()).filter(Boolean).map(s=>(!/^https?:\/\//i.test(s) && !s.startsWith('/'))?`assets/products/${s}`:s):[];
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
  const isNewAccount = !accounts.find(a=>a.email===email);
  user={name,email,phone,address}; 
  save(STORAGE_KEYS.USER,user); 
  // Also persist to accounts (for login)
  const existing = accounts.find(a=>a.email===email);
  if(!existing) { accounts.push({name,email,phone,address,password,created:Date.now()}); save(STORAGE_KEYS.ACCOUNTS, accounts); }
  $('#account-modal').classList.add('hidden'); 
  updateUserProfile();
  // If signup was for admin account, activate admin UI
  if(email === ADMIN_CREDS.email && phone === ADMIN_PHONE){ adminLoggedIn = true; const adm = $('#admin-status'); if(adm) adm.style.display='inline-block'; const ap = $('#admin-panel'); if(ap) ap.classList.remove('hidden'); renderAdminProducts(); renderStats(); renderAccounts(); }
  // Show welcome message if new account
  if(isNewAccount) showWelcomePopup(name);
  else showMessage('نجاح','✅ تم حفظ بيانات حسابك بنجاح','success');
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

  // Try to load optional client-side config (config.json) to prefill admin social credentials
  fetch('config.json').then(r=>{ if(!r.ok) throw new Error('no config'); return r.json(); }).then(cfg=>{
    try{
      // Only set keys if not already present in localStorage to avoid overwriting user changes
      if(cfg.fb_page_id && !localStorage.getItem('fb_page_id')) localStorage.setItem('fb_page_id', cfg.fb_page_id);
      if(cfg.fb_page_token && !localStorage.getItem('fb_page_token')) localStorage.setItem('fb_page_token', cfg.fb_page_token);
      if(cfg.ig_token && !localStorage.getItem('ig_token')) localStorage.setItem('ig_token', cfg.ig_token);
      if(cfg.tg_bot_token && !localStorage.getItem('tg_bot_token')) localStorage.setItem('tg_bot_token', cfg.tg_bot_token);
      if(cfg.tg_chat_id && !localStorage.getItem('tg_chat_id')) localStorage.setItem('tg_chat_id', cfg.tg_chat_id);
      if(cfg.deploy_token && !localStorage.getItem('deploy_token')) localStorage.setItem('deploy_token', cfg.deploy_token);
      console.info('Loaded client config from config.json');
    }catch(e){ console.warn('config.json found but could not be applied', e); }
  }).catch(()=>{/*no config.json — ok*/});

// Ensure social settings button is present only for admin users
function ensureSocialSettingsButton(){
  if(!adminLoggedIn) return;
  if(document.getElementById('social-settings-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'social-settings-btn';
  btn.className = 'btn';
  btn.textContent = '⚙️ إعدادات وسائل التواصل';
  btn.style.cssText = 'padding:8px 12px;font-size:13px;margin-right:8px';
  // Try to insert into admin actions area
  const adminActions = document.querySelector('.admin-actions') || document.querySelector('[style*="admin"]') || document.body;
  const firstBtn = adminActions ? adminActions.querySelector('button') : null;
  if(firstBtn) firstBtn.parentNode.insertBefore(btn, firstBtn);
  else if(adminActions) adminActions.appendChild(btn);
  btn.addEventListener('click', openSocialMediaSettings);
}

  // Render UI after loading products (skip users.json fetch to avoid auto-download)
  renderProducts(); 
  renderCart(); 
  renderStats();
  updateUserProfile();
  // If there's an existing logged-in user who is admin (email AND phone match), enable admin UI
  if(user && user.email && user.email === ADMIN_CREDS.email && user.phone && user.phone === ADMIN_PHONE){ adminLoggedIn = true; const adm = $('#admin-status'); if(adm) adm.style.display='inline-block'; const ap = $('#admin-panel'); if(ap) ap.classList.remove('hidden'); renderAdminProducts(); renderStats(); renderAccounts(); }
  
  // Cart (use modal)
  $('#open-cart').addEventListener('click', ()=>{ $('#cart-modal').classList.toggle('hidden'); });
  $('#close-cart-modal').addEventListener('click', ()=>{ $('#cart-modal').classList.add('hidden'); });
  $('#clear-cart-btn').addEventListener('click', ()=>{ showConfirm('❓ مسح العربة؟').then(ok=>{ if(!ok) return; cart=[]; save(STORAGE_KEYS.CART, cart); renderCart(); }); });
  $('#checkout-btn').addEventListener('click', checkout);
  
  // Coupon handlers
  const couponInput = $('#coupon-input');
  if(couponInput){
    couponInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') applyCouponCode(e.target.value); });
  }
  const applyCouponBtn = $('#apply-coupon-btn');
  if(applyCouponBtn){
    applyCouponBtn.addEventListener('click', ()=>{ applyCouponCode(couponInput.value); });
  }
  
  // Admin coupons
  const adminCouponsBtn = $('#admin-coupons-btn');
  if(adminCouponsBtn){
    adminCouponsBtn.addEventListener('click', openCouponsModal);
  }
  
  // Coupon modal events
  const couponSaveBtn = $('#coupon-save');
  if(couponSaveBtn) couponSaveBtn.addEventListener('click', saveCouponModal);
  
  const couponCancelBtn = $('#coupon-cancel');
  if(couponCancelBtn) couponCancelBtn.addEventListener('click', ()=>{ 
    $('#coupons-modal').classList.add('hidden');
    $('#coupon-code').value=''; $('#coupon-value').value=''; $('#coupon-expires').value=''; $('#coupon-usage').value='';
  });
  
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
  // Import publish config (JSON) handler
  const importConfigBtn = $('#import-config-btn');
  const importConfigFile = $('#import-config-file');
  if(importConfigBtn && importConfigFile){
    importConfigBtn.addEventListener('click', ()=> importConfigFile.click());
    importConfigFile.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = (evt)=>{
        try{
          const cfg = JSON.parse(evt.target.result);
          const accepted = ['fb_page_id','fb_page_token','ig_token','tg_bot_token','tg_chat_id','deploy_token'];
          let found = 0;
          accepted.forEach(k=>{ if(cfg[k]){ localStorage.setItem(k, String(cfg[k])); found++; } });
          if(found>0){
            showMessage('نجاح','✅ تم استيراد ملف الكونفيج وحفظ القيم محلياً','success').then(()=>{ openSocialMediaSettings(); });
          } else {
            showMessage('تنبيه','⚠️ الملف لا يحتوي على مفاتيح معروفة (fb_page_id, fb_page_token, ig_token, tg_bot_token, tg_chat_id)','error');
          }
        }catch(err){
          showMessage('خطأ','❌ فشل في قراءة الملف. تأكد أنه JSON صالح.','error');
        }
      };
      reader.readAsText(f);
      // reset input so same file can be re-uploaded if needed
      importConfigFile.value = '';
    });
  }
  $('#export-products').addEventListener('click', exportProducts);
  $('#logout-admin').addEventListener('click', logoutAdmin);
  $('#generate-desc').addEventListener('click', generateDescriptionForSelected);
  // social settings button is created only for admin via ensureSocialSettingsButton()
  if(adminLoggedIn) ensureSocialSettingsButton();
  // admin product modal buttons
  const apSave = $('#ap-save'); if(apSave) apSave.addEventListener('click', saveAdminProductFromModal);
  const apCancel = $('#ap-cancel'); if(apCancel) apCancel.addEventListener('click', cancelAdminProductModal);
  // export JSON
  const expJson = $('#export-products-json'); if(expJson) expJson.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(products, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='products_'+Date.now()+'.json'; a.click();
  });
  
  // Search & Sort & Category Filter
  $('#search-input').addEventListener('input', (e)=>{ renderProducts(e.target.value, $('#sort-select').value, $('#category-filter').value); });
  $('#sort-select').addEventListener('change', (e)=>{ renderProducts($('#search-input').value, e.target.value, $('#category-filter').value); });
  $('#category-filter').addEventListener('change', (e)=>{ renderProducts($('#search-input').value, $('#sort-select').value, e.target.value); });

  // product modal close
  const pmClose = document.getElementById('pm-close'); if(pmClose) pmClose.addEventListener('click', closeProductModal);
  // Review stars & submit handlers (delegated)
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if(t && t.classList && t.classList.contains('star-btn')){
      const rating = parseInt(t.getAttribute('data-rating')) || 0;
      window.selectedRating = rating;
      document.querySelectorAll('.star-btn').forEach(b=>{ const r = parseInt(b.getAttribute('data-rating'))||0; b.textContent = (r <= rating) ? '★' : '☆'; });
      const sel = document.getElementById('selected-rating'); if(sel) sel.textContent = String(window.selectedRating || 0);
    }
  });
  const submitReviewBtn = document.getElementById('submit-review');
  if(submitReviewBtn){
    submitReviewBtn.addEventListener('click', ()=>{
      const rating = window.selectedRating || parseInt((document.getElementById('selected-rating')||{textContent:'0'}).textContent) || 0;
      const comment = (document.getElementById('review-comment')||{value:''}).value.trim();
      const pid = window.currentProductId;
      if(!pid){ showMessage('خطأ','❌ حدث خطأ: لم يتم تحديد المنتج','error'); return; }
      if(rating<=0){ showMessage('تنبيه','❌ الرجاء اختيار عدد النجوم أولاً','error'); return; }
      if(!user){ showMessage('تنبيه','❌ الرجاء تسجيل الدخول لإضافة تقييم','error').then(()=>{ openAccountModal(); }); return; }
      const userName = user && user.name ? user.name : 'مستخدم'
      saveReview(pid, rating, comment, userName);
      showMessage('نجاح','✅ تم إضافة التقييم بنجاح','success').then(()=>{ openProductModal(pid); });
    });
  }
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

// إدارة الكوبونات
const couponsBtn = document.getElementById('admin-coupons-btn');
if(couponsBtn){
  couponsBtn.addEventListener('click', ()=>{
    document.getElementById('admin-coupons-modal').classList.remove('hidden');
    renderCouponsList();
  });
}
const couponsModal = document.getElementById('admin-coupons-modal');
if(couponsModal){
  couponsModal.querySelector('#coupon-cancel').addEventListener('click', ()=>{
    couponsModal.classList.add('hidden');
  });
  couponsModal.querySelector('#coupon-save').addEventListener('click', ()=>{
    const code = couponsModal.querySelector('#coupon-code').value.trim();
    const type = couponsModal.querySelector('#coupon-type').value;
    const value = parseFloat(couponsModal.querySelector('#coupon-value').value)||0;
    const category = couponsModal.querySelector('#coupon-category').value;
    const expires = couponsModal.querySelector('#coupon-expires').value ? new Date(couponsModal.querySelector('#coupon-expires').value).getTime() : null;
    const usageLimit = parseInt(couponsModal.querySelector('#coupon-usage').value)||null;
    const active = couponsModal.querySelector('#coupon-active').checked;
    if(!code || !value){ showMessage('خطأ','❌ يجب إدخال كود وقيمة الخصم','error'); return; }
    saveCoupon({code,type,value,category,expires,usageLimit,active,usedCount:0});
    renderCouponsList();
    showMessage('نجاح','✅ تم حفظ الكوبون','success');
  });
}

function renderCouponsList(){
  const list = document.getElementById('coupons-list');
  if(!list) return;
  list.innerHTML = '';
  if(!coupons.length){ list.innerHTML = '<p style="color:rgba(255,255,255,0.5)">لا توجد كوبونات</p>'; return; }
  coupons.forEach(c=>{
    const el = document.createElement('div');
    el.style.cssText = 'background:rgba(255,255,255,0.04);padding:8px;border-radius:6px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;font-size:13px';
    el.innerHTML = `<div><strong>${c.code}</strong> <span style='color:#f59e42'>${c.type==='percent'?c.value+'%':c.value+' ج.م'}</span> ${c.category?'<span style="color:#06b6d4">('+c.category+')</span>':''} ${c.expires?'<span style="color:#ef4444">ينتهي '+(new Date(c.expires)).toLocaleDateString('ar-EG')+'</span>':''} ${c.active?'<span style="color:#22c55e">فعال</span>':'<span style="color:#ef4444">غير فعال</span>'}</div><button class='btn small' style='background:#ef4444;color:#fff' data-code='${c.code}'>🗑️ حذف</button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('button[data-code]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const code = btn.getAttribute('data-code');
      deleteCoupon(code);
      renderCouponsList();
      showMessage('تم','✅ تم حذف الكوبون','success');
    });
  });
}
