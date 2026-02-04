// elementSdk.js
(function () {

  let config = {};

  window.elementSdk = {

    init({ defaultConfig, onConfigChange }) {
      const saved = localStorage.getItem("LOCAL_CONFIG");
      config = saved ? JSON.parse(saved) : defaultConfig;
      onConfigChange(config);
      return { isOk: true };
    },

    setConfig(newConfig) {
      config = { ...config, ...newConfig };
      localStorage.setItem("LOCAL_CONFIG", JSON.stringify(config));
    },

    get config() {
      return config;
    }

  };

})();
