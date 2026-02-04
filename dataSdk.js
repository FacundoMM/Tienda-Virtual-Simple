// dataSdk.js
(function () {

  const STORAGE_KEY = "LOCAL_PRODUCTS_DB";
  let handler = null;

  function loadDB() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function saveDB(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (handler && handler.onDataChanged) {
      handler.onDataChanged([...data]);
    }
  }

  window.dataSdk = {

    async init(h) {
      handler = h;
      const data = loadDB();
      if (handler && handler.onDataChanged) {
        handler.onDataChanged([...data]);
      }
      return { isOk: true };
    },

    async create(item) {
      const db = loadDB();
      item.__backendId = crypto.randomUUID();
      if (!item.type) item.type = "product";
      db.push(item);
      saveDB(db);
      return { isOk: true };
    },

    async update(item) {
      const db = loadDB();
      const index = db.findIndex(p => p.__backendId === item.__backendId);
      if (index >= 0) {
        db[index] = item;
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
