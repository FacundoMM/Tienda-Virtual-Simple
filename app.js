const defaultConfig = {
  store_name: 'Comercial',
  whatsapp_number: '+595XXXXXXXXX',
  welcome_message: '¡Bienvenido a nuestra tienda!',
  background_color: '#f9fafb',
  surface_color: '#ffffff',
  text_color: '#1f2937',
  primary_color: '#667eea',
  secondary_color: '#764ba2'
};

/* -------------------------
   Estado global
   ------------------------- */
let products = [];
let cart = [];
let currentCategory = 'all';
let productToDelete = null;
let editingProductId = null;
let appConfig = { ...defaultConfig };

/* -------------------------
   Helpers: IDs & fallback
   ------------------------- */
function ensureBackendId(p) {
  if (!p.__backendId) {
    // preserve existing id if provided as 'id'
    p.__backendId = p.id ? String(p.id) : crypto.randomUUID();
  }
  return p;
}

/* -------------------------
   Load / Save Products
   - First checks localStorage 'products'
   - If not present, fetch products.json and seed localStorage
   ------------------------- */
async function loadProducts() {
  try {
    const saved = localStorage.getItem('products');
    if (saved) {
      products = JSON.parse(saved).map(ensureBackendId);
      // ensure type field (compat)
      products.forEach(p => { if (!p.type) p.type = 'product'; });
    } else {
      // fetch from products.json
      const res = await fetch('products.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('products.json not found or fetch failed');
      const json = await res.json();
      products = json.map(item => {
        const p = { ...item };
        if (!p.type) p.type = 'product';
        ensureBackendId(p);
        return p;
      });
      saveProducts();
    }
  } catch (err) {
    console.error('Error loading products:', err);
    products = []; // keep safe
  }
}

function saveProducts() {
  try {
    localStorage.setItem('products', JSON.stringify(products));
    // update product count and re-render admin/catalog
    renderProducts();
    renderAdminProducts();
    updateProductCount();
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

/* -------------------------
   Init Config (elementSdk compatibility)
   ------------------------- */
function initConfig() {
  // if elementSdk exists, keep compatibility and subscribe to changes
  if (window.elementSdk && typeof window.elementSdk.init === 'function') {
    try {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange: async (cfg) => {
          appConfig = { ...defaultConfig, ...(cfg || {}) };
          applyConfigToUI();
          updateWhatsAppLinks(appConfig.whatsapp_number || defaultConfig.whatsapp_number);
        },
        mapToCapabilities: (config) => ({
          // keep compatibility; not used locally
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map([
          ['store_name', config.store_name || defaultConfig.store_name],
          ['whatsapp_number', config.whatsapp_number || defaultConfig.whatsapp_number],
          ['welcome_message', config.welcome_message || defaultConfig.welcome_message]
        ])
      });
      // if elementSdk exposes config getter:
      if (window.elementSdk.config) {
        appConfig = { ...defaultConfig, ...window.elementSdk.config };
      }
    } catch (e) {
      console.warn('elementSdk init error', e);
      // fallback to local storage / defaults
      loadLocalConfig();
    }
  } else {
    // no elementSdk: load config from localStorage or default
    loadLocalConfig();
  }
}

function loadLocalConfig() {
  const raw = localStorage.getItem('app_config');
  if (raw) {
    try {
      appConfig = { ...defaultConfig, ...(JSON.parse(raw) || {}) };
    } catch {
      appConfig = { ...defaultConfig };
    }
  } else {
    appConfig = { ...defaultConfig };
  }
  applyConfigToUI();
  updateWhatsAppLinks(appConfig.whatsapp_number || defaultConfig.whatsapp_number);
}

function applyConfigToUI() {
  const storeTitle = document.getElementById('store-title');
  if (storeTitle) storeTitle.textContent = appConfig.store_name || defaultConfig.store_name;

  const welcomeText = document.getElementById('welcome-text');
  if (welcomeText) welcomeText.textContent = appConfig.welcome_message || defaultConfig.welcome_message;

  // apply colors to CSS vars if present
  if (appConfig.primary_color) document.documentElement.style.setProperty('--primary-color', appConfig.primary_color);
  if (appConfig.secondary_color) document.documentElement.style.setProperty('--secondary-color', appConfig.secondary_color);
  if (appConfig.background_color) document.documentElement.style.setProperty('--bg-color', appConfig.background_color);
}

/* -------------------------
   updateWhatsAppLinks
   ------------------------- */
function updateWhatsAppLinks(number) {
  if (!number) number = defaultConfig.whatsapp_number;
  const cleanNumber = number.replace(/[^0-9+]/g, '');
  const floatingBtn = document.getElementById('floating-whatsapp');
  const supportLink = document.getElementById('support-whatsapp-link');

  if (floatingBtn) floatingBtn.href = `https://wa.me/${cleanNumber.replace('+', '')}`;
  if (supportLink) supportLink.href = `https://wa.me/${cleanNumber.replace('+', '')}?text=Hola, necesito ayuda con mi pedido`;
}



function showView(viewName) {
  // hide all sections with class .view-section
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  const id = `view-${viewName}`;
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');

  // call renderers if needed
  if (viewName === 'cart') {
    renderCart();
  } else if (viewName === 'checkout') {
    renderCheckout();
  } else if (viewName === 'admin') {
    renderAdminProducts();
    updateProductCount();
  }
  window.scrollTo(0, 0);
}

/* -------------------------
   Toast
   ------------------------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

/* -------------------------
   Render products (catalog)
   ------------------------- */
function renderProducts() {
  const grid = document.getElementById('products-grid');
  const noProducts = document.getElementById('no-products');
  if (!grid) return;

  const activeProducts = products.filter(p => p.active !== false);
  const filteredProducts = filterProductsList(activeProducts);

  if (filteredProducts.length === 0) {
    grid.innerHTML = '';
    if (noProducts) noProducts.classList.remove('hidden');
    return;
  }

  if (noProducts) noProducts.classList.add('hidden');

  grid.innerHTML = filteredProducts.map(product => `
    <div class="product-card bg-white rounded-2xl overflow-hidden card-shadow" data-product-id="${product.__backendId}">
      <div class="h-32 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <span class="text-6xl">${product.image || '📦'}</span>
      </div>
      <div class="p-4">
        <span class="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">${product.category || ''}</span>
        <h3 class="font-bold text-gray-800 mt-2 mb-1">${product.name}</h3>
        <p class="text-gray-500 text-sm mb-3 line-clamp-2">${product.description || ''}</p>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg text-purple-600">₲${formatNumber(product.price)}</span>
          <button onclick="addToCart('${product.__backendId}')" 
            class="btn-primary text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/* -------------------------
   Filters & Search
   ------------------------- */
function filterProductsList(productList) {
  const searchInput = document.getElementById('search-input');
  const priceFilterEl = document.getElementById('price-filter');
  const searchTerm = (searchInput?.value || '').toLowerCase();
  const priceFilter = priceFilterEl ? priceFilterEl.value : 'all';

  return productList.filter(product => {
    // Category
    if (currentCategory !== 'all' && product.category !== currentCategory) return false;

    // Search
    if (searchTerm) {
      const name = product.name?.toLowerCase() || '';
      const desc = (product.description || '').toLowerCase();
      if (!name.includes(searchTerm) && !desc.includes(searchTerm)) return false;
    }

    // Price
    const price = Number(product.price || 0);
    if (priceFilter !== 'all') {
      if (priceFilter === '0-5000' && price > 5000) return false;
      if (priceFilter === '5000-15000' && (price < 5000 || price > 15000)) return false;
      if (priceFilter === '15000-50000' && (price < 15000 || price > 50000)) return false;
      if (priceFilter === '50000+' && price < 50000) return false;
    }

    return true;
  });
}

function filterProducts() { renderProducts(); }

function filterByCategory(category) {
  currentCategory = category;
  // toggle active class on chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.remove('active');
    if (chip.dataset && chip.dataset.category === category) chip.classList.add('active');
  });
  renderProducts();
}

/* -------------------------
   Voice search
   ------------------------- */
function startVoiceSearch() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('search-input');
      if (input) input.value = transcript;
      filterProducts();
    };
    recognition.start();
    showToast('🎤 Escuchando...');
  } else {
    showToast('Tu navegador no soporta búsqueda por voz');
  }
}

/* -------------------------
   Cart functions (sessionStorage)
   ------------------------- */
function saveCart() {
  sessionStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
  const raw = sessionStorage.getItem('cart');
  if (raw) {
    try { cart = JSON.parse(raw); } catch { cart = []; }
  } else cart = [];
  updateCartCount();
}

function addToCart(backendId) {
  const product = products.find(p => p.__backendId === backendId);
  if (!product) return;
  const existing = cart.find(i => i.productId === backendId);
  if (existing) existing.quantity++;
  else cart.push({ productId: backendId, quantity: 1 });
  saveCart();
  updateCartCount();
  showToast(`✓ ${product.name} agregado al carrito`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  saveCart();
  updateCartCount();
  renderCart();
}

function updateQuantity(productId, change) {
  const it = cart.find(i => i.productId === productId);
  if (!it) return;
  it.quantity += change;
  if (it.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  renderCart();
}

function updateCartCount() {
  const count = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  const countEl = document.getElementById('cart-count');
  if (!countEl) return;
  if (count > 0) {
    countEl.textContent = count;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const p = products.find(x => x.__backendId === item.productId);
    return sum + (p ? (Number(p.price || 0) * item.quantity) : 0);
  }, 0);
}

/* -------------------------
   Render cart & checkout
   ------------------------- */
function renderCart() {
  const cartEmpty = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  if (!cartItems) return;

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.classList.remove('hidden');
    if (cartContent) cartContent.classList.add('hidden');
    return;
  }

  if (cartEmpty) cartEmpty.classList.add('hidden');
  if (cartContent) cartContent.classList.remove('hidden');

  cartItems.innerHTML = cart.map(item => {
    const p = products.find(prod => prod.__backendId === item.productId);
    if (!p) return '';
    return `
      <div class="bg-white rounded-xl p-4 card-shadow flex items-center gap-4">
        <div class="w-16 h-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-3xl">${p.image || '📦'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-gray-800 truncate">${p.name}</h4>
          <p class="text-purple-600 font-semibold">₲${formatNumber(p.price)}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="updateQuantity('${item.productId}', -1)" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">−</button>
          <span class="w-8 text-center font-bold">${item.quantity}</span>
          <button onclick="updateQuantity('${item.productId}', 1)" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">+</button>
        </div>
        <button onclick="removeFromCart('${item.productId}')" class="p-2 text-red-500 hover:bg-red-50 rounded-full">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  if (cartTotal) cartTotal.textContent = `₲${formatNumber(getCartTotal())}`;
}

/* -------------------------
   Render checkout
   ------------------------- */
function renderCheckout() {
  const checkoutItems = document.getElementById('checkout-items');
  const checkoutTotal = document.getElementById('checkout-total');
  if (!checkoutItems) return;

  checkoutItems.innerHTML = cart.map(item => {
    const p = products.find(prod => prod.__backendId === item.productId);
    if (!p) return '';
    return `
      <div class="flex items-center justify-between py-2 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <span class="text-xl">${p.image || '📦'}</span>
          <span class="text-gray-800">${p.name}</span>
          <span class="text-gray-500">x${item.quantity}</span>
        </div>
        <span class="font-semibold">₲${formatNumber(p.price * item.quantity)}</span>
      </div>
    `;
  }).join('');

  if (checkoutTotal) checkoutTotal.textContent = `₲${formatNumber(getCartTotal())}`;
}

/* -------------------------
   WhatsApp integration (checkout)
   ------------------------- */
function sendToWhatsApp() {
  const name = document.getElementById('customer-name')?.value.trim();
  const cedula = document.getElementById('customer-id')?.value.trim();
  const address = document.getElementById('customer-address')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();

  if (!name || !cedula || !address) {
    showToast('⚠️ Por favor completá todos los campos obligatorios');
    return;
  }

  const orderNumber = Math.floor(1000 + Math.random() * 9000);
  const whatsappRaw = (appConfig.whatsapp_number || defaultConfig.whatsapp_number).replace(/[^0-9]/g, '');
  let message = `*🛒 PEDIDO #${orderNumber}*\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `*📋 Productos:*\n`;

  cart.forEach(item => {
    const product = products.find(p => p.__backendId === item.productId);
    if (product) {
      message += `• ${product.name} x${item.quantity} - ₲${formatNumber(product.price * item.quantity)}\n`;
    }
  });

  message += `\n*💰 TOTAL: ₲${formatNumber(getCartTotal())}*\n\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `*👤 Datos del Cliente:*\n`;
  message += `• Nombre: ${name}\n`;
  message += `• Cédula: ${cedula}\n`;
  message += `• Dirección: ${address}\n`;
  if (phone) message += `• Teléfono: ${phone}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  message += `_Pedido generado desde la web_`;

  const whatsappUrl = `https://wa.me/${whatsappRaw}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  cart = [];
  saveCart();
  updateCartCount();
  showToast('✓ Pedido preparado para enviar');

  setTimeout(() => showView('catalog'), 1500);
}

/* -------------------------
   Admin functions (modal based)
   - showProductModal, hideProductModal, saveProduct (create/update)
   - renderAdminProducts already implemented below
   ------------------------- */
function renderAdminProducts() {
  const list = document.getElementById('admin-products-list');
  const noProducts = document.getElementById('admin-no-products');
  const searchTerm = document.getElementById('admin-search')?.value.toLowerCase() || '';

  if (!list) return;

  let filteredProducts = products;
  if (searchTerm) {
    filteredProducts = products.filter(p =>
      (p.name || '').toLowerCase().includes(searchTerm) ||
      (p.category || '').toLowerCase().includes(searchTerm)
    );
  }

  if (filteredProducts.length === 0) {
    list.innerHTML = '';
    if (noProducts) noProducts.classList.remove('hidden');
    return;
  }
  if (noProducts) noProducts.classList.add('hidden');

  list.innerHTML = filteredProducts.map(product => `
    <div class="bg-white rounded-xl p-4 card-shadow flex flex-col sm:flex-row sm:items-center gap-4" data-admin-product="${product.__backendId}">
      <div class="flex items-center gap-4 flex-1">
        <div class="w-14 h-14 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-3xl">${product.image || '📦'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h4 class="font-bold text-gray-800 truncate">${product.name}</h4>
            ${product.active === false ? '<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactivo</span>' : ''}
          </div>
          <p class="text-gray-500 text-sm truncate">${product.description || 'Sin descripción'}</p>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-purple-600 font-bold">₲${formatNumber(product.price)}</span>
            <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">${product.category || ''}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:flex-shrink-0">
        <button onclick="toggleProductActive('${product.__backendId}')" 
          class="p-2 ${product.active !== false ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'} rounded-lg transition" 
          title="${product.active !== false ? 'Desactivar' : 'Activar'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${product.active !== false ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' : 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'}"></path>
          </svg>
        </button>
        <button onclick="editProductModal('${product.__backendId}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button onclick="showDeleteModal('${product.__backendId}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* -------------------------
   update product count
   ------------------------- */
function updateProductCount() {
  const countEl = document.getElementById('admin-product-count');
  const warningEl = document.getElementById('limit-warning');
  if (countEl) countEl.textContent = products.length;
  if (warningEl) {
    if (products.length >= 900) warningEl.classList.remove('hidden'); else warningEl.classList.add('hidden');
  }
}

/* -------------------------
   Product Modal: show / hide / save
   ------------------------- */
function showProductModal(productId = null) {
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('product-form');
  if (!modal || !form) return;

  form.reset();
  editingProductId = productId;

  if (productId) {
    const product = products.find(p => p.__backendId === productId);
    if (product) {
      modalTitle.textContent = 'Editar Producto';
      document.getElementById('product-id').value = productId;
      document.getElementById('product-image').value = product.image || '';
      document.getElementById('product-name').value = product.name || '';
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-price').value = product.price || 0;
      document.getElementById('product-category').value = product.category || '';
      document.getElementById('product-active').checked = product.active !== false;
    }
  } else {
    modalTitle.textContent = 'Agregar Producto';
    document.getElementById('product-active').checked = true;
  }

  modal.classList.remove('hidden');
}

function hideProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
  editingProductId = null;
}

async function saveProduct(event) {
  event.preventDefault();
  const btn = document.getElementById('save-product-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
  }

  const productData = {
    type: 'product',
    image: document.getElementById('product-image')?.value.trim() || '📦',
    name: document.getElementById('product-name')?.value.trim() || 'Sin nombre',
    description: document.getElementById('product-description')?.value.trim() || '',
    price: parseInt(document.getElementById('product-price')?.value) || 0,
    category: document.getElementById('product-category')?.value || 'General',
    active: !!document.getElementById('product-active')?.checked,
    createdAt: new Date().toISOString()
  };

  if (editingProductId) {
    // update
    const idx = products.findIndex(p => p.__backendId === editingProductId);
    if (idx >= 0) {
      products[idx] = { ...products[idx], ...productData };
      // ensure __backendId not lost:
      products[idx].__backendId = editingProductId;
      saveProducts();
      showToast('✓ Producto actualizado');
    } else {
      showToast('❌ Producto no encontrado');
    }
  } else {
    // create
    productData.__backendId = crypto.randomUUID();
    products.push(productData);
    saveProducts();
    showToast('✓ Producto agregado');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>Guardar Producto</span>';
  }

  hideProductModal();
}

/* shortcut used in admin list */
function editProductModal(productId) { showProductModal(productId); }

/* -------------------------
   Toggle active
   ------------------------- */
function toggleProductActive(productId) {
  const p = products.find(x => x.__backendId === productId);
  if (!p) return;
  p.active = p.active === false ? true : false;
  saveProducts();
  showToast(p.active ? '✓ Producto activado' : '✓ Producto desactivado');
}

/* -------------------------
   Delete modal flow
   ------------------------- */
function showDeleteModal(productId) {
  productToDelete = productId;
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.remove('hidden');
}

function hideDeleteModal() {
  productToDelete = null;
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.add('hidden');
}

async function confirmDelete() {
  if (!productToDelete) return;
  const btn = document.getElementById('confirm-delete-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Eliminando...'; }

  const idx = products.findIndex(p => p.__backendId === productToDelete);
  if (idx >= 0) {
    const removed = products.splice(idx, 1);
    saveProducts();
    // remove from cart as well
    cart = cart.filter(i => i.productId !== productToDelete);
    saveCart();
    updateCartCount();
    showToast('✓ Producto eliminado');
  } else {
    showToast('❌ Producto no encontrado');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Eliminar'; }
  hideDeleteModal();
}

/* -------------------------
   Utilities
   ------------------------- */
function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* -------------------------
   Start app
   ------------------------- */
async function initApp() {
  await loadProducts();
  loadCart();
  initConfig();
  renderProducts();
  renderAdminProducts();
  updateProductCount();
}

// call init (defer in index.html is okay; still ensure DOM loaded)
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
