const { createInitialAppData } = require("./data/mock-data");

const storageKey = "finished.weapp.data";

App({
  globalData: {
    appData: null,
  },

  onLaunch() {
    const savedData = wx.getStorageSync(storageKey);
    const appData = savedData || createInitialAppData();
    this.globalData.appData = appData;
    wx.setStorageSync(storageKey, appData);
  },

  getAppData() {
    if (!this.globalData.appData) {
      this.globalData.appData = wx.getStorageSync(storageKey) || createInitialAppData();
    }
    return this.globalData.appData;
  },

  saveAppData(nextData) {
    this.globalData.appData = nextData;
    wx.setStorageSync(storageKey, nextData);
  },
});
