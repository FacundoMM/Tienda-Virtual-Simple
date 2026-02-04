/* Default Configuration   */

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

// App State
let products = [];
let cart = [];
let currentCategory = 'all';
let productToDelete = null;
let editingProductId = null;

// Initialize Element SDK
if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange: async (config) => {
      // Update store name
      const storeTitle = document.getElementById('store-title');
      if (storeTitle) storeTitle.textContent = config.store_name || defaultConfig.store_name;

      // Update welcome message
      const welcomeText = document.getElementById('welcome-text');
      if (welcomeText) welcomeText.textContent = config.welcome_message || defaultConfig.welcome_message;

      // Update WhatsApp links
      updateWhatsAppLinks(config.whatsapp_number || defaultConfig.whatsapp_number);

      // Update colors
      document.documentElement.style.setProperty('--primary-color', config.primary_color || defaultConfig.primary_color);
      document.documentElement.style.setProperty('--secondary-color', config.secondary_color || defaultConfig.secondary_color);
    },

    mapToCapabilities: (config) => ({
      recolorables: [
        {
          get: () => config.background_color || defaultConfig.background_color,
          set: (value) => window.elementSdk.setConfig({ background_color: value })
        },
        {
          get: () => config.surface_color || defaultConfig.surface_color,
          set: (value) => window.elementSdk.setConfig({ surface_color: value })
        },
        {
          get: () => config.text_color || defaultConfig.text_color,
          set: (value) => window.elementSdk.setConfig({ text_color: value })
        },
        {
          get: () => config.primary_color || defaultConfig.primary_color,
          set: (value) => window.elementSdk.setConfig({ primary_color: value })
        },
        {
          get: () => config.secondary_color || defaultConfig.secondary_color,
          set: (value) => window.elementSdk.setConfig({ secondary_color: value })
        }
      ],
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
}

// Initialize Data SDK
const dataHandler = {
  onDataChanged(data) {
    products = data.filter(item => item.type === 'product');
    renderProducts();
    renderAdminProducts();
    updateProductCount();
  }
};

// Initialize app
async function initApp() {
  if (window.dataSdk) {
    const result = await window.dataSdk.init(dataHandler);
    if (!result.isOk) {
      console.error('Failed to initialize data SDK');
    } else {
      // Add sample products if none exist
      if (products.length === 0) {
        await addSampleProducts();
      }
    }
  }
  if (!localStorage.getItem("LOCAL_PRODUCTS_DB")) {
   await addSampleProducts();
  }

  // Load cart from session
  const savedCart = sessionStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartCount();
  }
}

// Add sample products
async function addSampleProducts() {
  const sampleProducts = [
    { type: 'product', image: '🍞', name: 'Pan Francés', description: 'Pan fresco del día, 6 unidades', price: 5000, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🥛', name: 'Leche Entera', description: 'Leche entera 1 litro', price: 8500, category: 'Bebidas', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧀', name: 'Queso Paraguayo', description: 'Queso fresco artesanal, 500g', price: 12000, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🥤', name: 'Coca Cola 2L', description: 'Gaseosa Coca Cola 2 litros', price: 9500, category: 'Bebidas', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🍚', name: 'Arroz Blanco', description: 'Arroz blanco tipo 1, 1kg', price: 7000, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧹', name: 'Escoba', description: 'Escoba de cerda sintética', price: 15000, category: 'Limpieza', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧼', name: 'Jabón Líquido', description: 'Jabón líquido para manos 500ml', price: 12000, category: 'Limpieza', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🍝', name: 'Fideos', description: 'Fideos secos 500g', price: 6500, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '☕', name: 'Café Molido', description: 'Café molido 250g', price: 18000, category: 'Bebidas', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🥫', name: 'Aceite de Girasol', description: 'Aceite vegetal 900ml', price: 14000, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧴', name: 'Detergente', description: 'Detergente líquido 1L', price: 16000, category: 'Limpieza', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🍳', name: 'Huevos', description: 'Docena de huevos frescos', price: 10000, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧻', name: 'Papel Higiénico', description: 'Papel higiénico paquete x4', price: 11000, category: 'Bazar', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🍅', name: 'Salsa de Tomate', description: 'Salsa de tomate 340g', price: 4500, category: 'Alimentos', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🧽', name: 'Esponja', description: 'Esponja para lavar platos x3', price: 5000, category: 'Limpieza', active: true, createdAt: new Date().toISOString() },
    { type: 'product', image: '🍷', name: 'Jugo de Naranja', description: 'Jugo natural 1 litro', price: 7500, category: 'Bebidas', active: true, createdAt: new Date().toISOString() },
  ];

  for (const product of sampleProducts) {
    await window.dataSdk.create(product);
  }
}

initApp();

// Update WhatsApp links
function updateWhatsAppLinks(number) {
  const cleanNumber = number.replace(/[^0-9+]/g, '');
  const floatingBtn = document.getElementById('floating-whatsapp');
  const supportLink = document.getElementById('support-whatsapp-link');

  if (floatingBtn) floatingBtn.href = `https://wa.me/${cleanNumber.replace('+', '')}`;
  if (supportLink) supportLink.href = `https://wa.me/${cleanNumber.replace('+', '')}?text=Hola, necesito ayuda con mi pedido`;
}

// View management
function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${viewName}`).classList.remove('hidden');

  if (viewName === 'cart') {
    renderCart();
  } else if (viewName === 'checkout') {
    renderCheckout();
  }

  window.scrollTo(0, 0);
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// Product rendering
function renderProducts() {
  const grid = document.getElementById('products-grid');
  const noProducts = document.getElementById('no-products');

  const activeProducts = products.filter(p => p.active !== false);
  const filteredProducts = filterProductsList(activeProducts);

  if (filteredProducts.length === 0) {
    grid.innerHTML = '';
    noProducts.classList.remove('hidden');
    return;
  }

  noProducts.classList.add('hidden');

  grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card bg-white rounded-2xl overflow-hidden card-shadow" data-product-id="${product.__backendId}">
          <div class="h-32 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
            <span class="text-6xl">${product.image || '📦'}</span>
          </div>
          <div class="p-4">
            <span class="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">${product.category}</span>
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

function filterProductsList(productList) {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const priceFilter = document.getElementById('price-filter').value;

  return productList.filter(product => {
    // Category filter
    if (currentCategory !== 'all' && product.category !== currentCategory) return false;

    // Search filter
    if (searchTerm && !product.name.toLowerCase().includes(searchTerm) &&
      !(product.description || '').toLowerCase().includes(searchTerm)) return false;

    // Price filter
    if (priceFilter !== 'all') {
      const price = product.price;
      if (priceFilter === '0-5000' && price > 5000) return false;
      if (priceFilter === '5000-15000' && (price < 5000 || price > 15000)) return false;
      if (priceFilter === '15000-50000' && (price < 15000 || price > 50000)) return false;
      if (priceFilter === '50000+' && price < 50000) return false;
    }

    return true;
  });
}

function filterProducts() {
  renderProducts();
}

function filterByCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.remove('active');
    if (chip.dataset.category === category) chip.classList.add('active');
  });

  renderProducts();
}

// Voice search (simplified)
function startVoiceSearch() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('search-input').value = transcript;
      filterProducts();
    };
    recognition.start();
    showToast('🎤 Escuchando...');
  } else {
    showToast('Tu navegador no soporta búsqueda por voz');
  }
}

// Cart functions
function addToCart(productId) {
  const product = products.find(p => p.__backendId === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ productId, quantity: 1 });
  }

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
  const item = cart.find(item => item.productId === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCart();
}

function saveCart() {
  sessionStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cart-count');

  if (count > 0) {
    countEl.textContent = count;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const product = products.find(p => p.__backendId === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

function renderCart() {
  const cartEmpty = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  if (cart.length === 0) {
    cartEmpty.classList.remove('hidden');
    cartContent.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartContent.classList.remove('hidden');

  cartItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.__backendId === item.productId);
    if (!product) return '';

    return `
          <div class="bg-white rounded-xl p-4 card-shadow flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <span class="text-3xl">${product.image || '📦'}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-gray-800 truncate">${product.name}</h4>
              <p class="text-purple-600 font-semibold">₲${formatNumber(product.price)}</p>
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

  cartTotal.textContent = `₲${formatNumber(getCartTotal())}`;
}

function renderCheckout() {
  const checkoutItems = document.getElementById('checkout-items');
  const checkoutTotal = document.getElementById('checkout-total');

  checkoutItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.__backendId === item.productId);
    if (!product) return '';

    return `
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <span class="text-xl">${product.image || '📦'}</span>
              <span class="text-gray-800">${product.name}</span>
              <span class="text-gray-500">x${item.quantity}</span>
            </div>
            <span class="font-semibold">₲${formatNumber(product.price * item.quantity)}</span>
          </div>
        `;
  }).join('');

  checkoutTotal.textContent = `₲${formatNumber(getCartTotal())}`;
}

// Send to WhatsApp
function sendToWhatsApp() {
  const name = document.getElementById('customer-name').value.trim();
  const cedula = document.getElementById('customer-id').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();

  if (!name || !cedula || !address) {
    showToast('⚠️ Por favor completá todos los campos obligatorios');
    return;
  }

  const orderNumber = Math.floor(1000 + Math.random() * 9000);
  const config = window.elementSdk?.config || defaultConfig;
  const whatsappNumber = (config.whatsapp_number || defaultConfig.whatsapp_number).replace(/[^0-9]/g, '');

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

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  // Clear cart after sending
  cart = [];
  saveCart();
  updateCartCount();
  showToast('✓ Pedido preparado para enviar');

  setTimeout(() => showView('catalog'), 1500);
}

// Admin functions
function renderAdminProducts() {
  const list = document.getElementById('admin-products-list');
  const noProducts = document.getElementById('admin-no-products');
  const searchTerm = document.getElementById('admin-search')?.value.toLowerCase() || '';

  let filteredProducts = products;
  if (searchTerm) {
    filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm)
    );
  }

  if (filteredProducts.length === 0) {
    list.innerHTML = '';
    noProducts.classList.remove('hidden');
    return;
  }

  noProducts.classList.add('hidden');

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
                <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">${product.category}</span>
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
            <button onclick="editProduct('${product.__backendId}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
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

function filterAdminProducts() {
  renderAdminProducts();
}

function updateProductCount() {
  const countEl = document.getElementById('admin-product-count');
  const warningEl = document.getElementById('limit-warning');

  if (countEl) countEl.textContent = products.length;
  if (warningEl) {
    if (products.length >= 900) {
      warningEl.classList.remove('hidden');
    } else {
      warningEl.classList.add('hidden');
    }
  }
}

// Product modal
function showProductModal(productId = null) {
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('product-form');

  form.reset();
  editingProductId = productId;

  if (productId) {
    const product = products.find(p => p.__backendId === productId);
    if (product) {
      modalTitle.textContent = 'Editar Producto';
      document.getElementById('product-id').value = productId;
      document.getElementById('product-image').value = product.image || '';
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-active').checked = product.active !== false;
    }
  } else {
    modalTitle.textContent = 'Agregar Producto';
    document.getElementById('product-active').checked = true;
  }

  modal.classList.remove('hidden');
}

function hideProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
  editingProductId = null;
}

async function saveProduct(event) {
  event.preventDefault();

  if (products.length >= 999 && !editingProductId) {
    showToast('⚠️ Límite de 999 productos alcanzado');
    return;
  }

  const btn = document.getElementById('save-product-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';

  const productData = {
    type: 'product',
    image: document.getElementById('product-image').value.trim() || '📦',
    name: document.getElementById('product-name').value.trim(),
    description: document.getElementById('product-description').value.trim(),
    price: parseInt(document.getElementById('product-price').value) || 0,
    category: document.getElementById('product-category').value,
    active: document.getElementById('product-active').checked,
    createdAt: new Date().toISOString()
  };

  let result;
  if (editingProductId) {
    const existingProduct = products.find(p => p.__backendId === editingProductId);
    if (existingProduct) {
      result = await window.dataSdk.update({ ...existingProduct, ...productData });
    }
  } else {
    result = await window.dataSdk.create(productData);
  }

  btn.disabled = false;
  btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Guardar Producto</span>';

  if (result.isOk) {
    hideProductModal();
    showToast(editingProductId ? '✓ Producto actualizado' : '✓ Producto agregado');
  } else {
    showToast('❌ Error al guardar el producto');
  }
}

function editProduct(productId) {
  showProductModal(productId);
}

async function toggleProductActive(productId) {
  const product = products.find(p => p.__backendId === productId);
  if (!product) return;

  const result = await window.dataSdk.update({
    ...product,
    active: product.active === false ? true : false
  });

  if (result.isOk) {
    showToast(product.active === false ? '✓ Producto activado' : '✓ Producto desactivado');
  } else {
    showToast('❌ Error al actualizar el producto');
  }
}

// Delete modal
function showDeleteModal(productId) {
  productToDelete = productId;
  document.getElementById('delete-modal').classList.remove('hidden');
}

function hideDeleteModal() {
  productToDelete = null;
  document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
  if (!productToDelete) return;

  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Eliminando...';

  const product = products.find(p => p.__backendId === productToDelete);
  if (product) {
    const result = await window.dataSdk.delete(product);

    if (result.isOk) {
      showToast('✓ Producto eliminado');
      // Also remove from cart if present
      cart = cart.filter(item => item.productId !== productToDelete);
      saveCart();
      updateCartCount();
    } else {
      showToast('❌ Error al eliminar el producto');
    }
  }

  btn.disabled = false;
  btn.textContent = 'Eliminar';
  hideDeleteModal();
}

// Utility functions
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}


