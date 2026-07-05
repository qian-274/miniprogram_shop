// app.js
App({
  onLaunch() {

    wx.cloud.init({
      env: 'cloud1-d0gztoj7x90925f91'
    })


  },
  globalData: {
    userInfo: null
  }
})
