function readStorage(key, fallbackValue) {
  const value = wx.getStorageSync(key);
  return value || fallbackValue;
}

function writeStorage(key, value) {
  wx.setStorageSync(key, value);
}

module.exports = {
  readStorage,
  writeStorage,
};
