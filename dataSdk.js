// dataSdk.js
(function () {

  let handler = null;

  // ===== BASE DE DATOS EN MEMORIA =====
  let db = [
    {
      type: "product",
      __backendId: "1",
      image: "🍞",
      name: "Pan Francés",
      description: "Pan fresco del día (6 unidades)",
      price: 5000,
      category: "Alimentos",
      active: true
    },
    {
      type: "product",
      __backendId: "2",
      image: "🥛",
      name: "Leche Entera",
      description: "Leche entera 1 litro",
      price: 8500,
      category: "Bebidas",
      active: true
    },
    {
      type: "product",
      __backendId: "3",
      image: "🧀",
      name: "Queso Paraguayo",
      description: "Queso fresco artesanal 500g",
      price: 12000,
      category: "Alimentos",
      active: true
    },
    {
      type: "product",
      __backendId: "4",
      image: "🥤",
      name: "Coca Cola 2L",
      description: "Gaseosa Coca Cola 2 litros",
      price: 9500,
      category: "Bebidas",
      active: true
    }
  ];

  function notify() {
    if (handler && handler.onDataChanged) {
      handler.onDataChanged([...db]);
    }
  }

  window.dataSdk = {

    async init(h) {
      handler = h;
      notify();
      return { isOk: true };
    },

    async create(item) {
      item.__backendId = crypto.randomUUID();
      item.type = "product";
      db.push(item);
      notify();
      return { isOk: true };
    },

    async update(item) {
      const i = db.findIndex(p => p.__backendId === item.__backendId);
      if (i >= 0) {
        db[i] = item;
        notify();
        return { isOk: true };
      }
      return { isOk: false };
    },

    async delete(item) {
      db = db.filter(p => p.__backendId !== item.__backendId);
      notify();
      return { isOk: true };
    }

  };

})();
