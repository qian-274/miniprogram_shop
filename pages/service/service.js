Page({
  callPhone() {
    wx.makePhoneCall({
      phoneNumber: '4008001234',
      fail: () => {
        wx.showToast({
          title: '电话客服暂不可用',
          icon: 'none'
        })
      }
    })
  },

  copyWechat() {
    wx.setClipboardData({
      data: 'fresh-community-service',
      success: () => {
        wx.showToast({
          title: '已复制客服微信',
          icon: 'success'
        })
      }
    })
  }
})
