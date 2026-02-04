// dataSdk.js
(function () {

  const STORAGE_KEY = "LOCAL_PRODUCTS_DB";
  let handler = null;

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function saveDB(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (handler && handler.onDataChanged) {
      handler.onDataChanged(data);
    }
  }

  function initialProducts() {
    return [
      { type: "product", __backendId: crypto.randomUUID(), image: "🍞", name: "Pan Francés", description: "Pan fresco del día, 6 unidades", price: 5000, category: "Alimentos", active: true },
      { type: "product", __backendId: crypto.randomUUID(), image: "🥛", name: "Leche Entera", description: "Leche entera 1 litro", price: 8500, category: "Bebidas", active: true },
      { type: "product", __backendId: crypto.randomUUID(), image: "🧀", name: "Queso Paraguayo", description: "Queso fresco artesanal, 500g", price: 12000, category: "Alimentos", active: true },
      { type: "product", __backendId: crypto.randomUUID(), image: "🥤", name: "Coca Cola 2L", description: "Gaseosa Coca Cola 2 litros", price: 9500, category: "Bebidas", active: true }
    ];
  }

  window.dataSdk = {

    async init(h) {
      handler = h;
      let db = loadDB();
      if (!db) {
        db = initialProducts();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      }
      if (handler && handler.onDataChanged) {
        handler.onDataChanged(db);
      }
      return { isOk: true };
    },

    async create(item) {
      const db = loadDB();
      item.__backendId = crypto.randomUUID();
      db.push(item);
      saveDB(db);
      return { isOk: true };
    },

    async update(updated) {
      const db = loadDB();
      const index = db.findIndex(p => p.__backendId === updated.__backendId);
      if (index >= 0) {
        db[index] = updated;
        saveDB(db);
        return { isOk: true };
      }
      return { isOk: false };
    },

    async delete(item) {
      let db = loadDB();
      db = db.filter(p => p.__backendId !== item.__backendId);
      saveDB(db);
      return { isOk: true };
    }

  };

})();
