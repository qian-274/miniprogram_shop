App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d0gztoj7x90925f91',
        traceUser: true
      })
    }
  },
  globalData: {
    userInfo: null
  }
})
