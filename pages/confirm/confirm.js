const store = require('../../utils/store')

Page({
  data: {
    checkout: {
      items: [],
      totalText: '0.00'
    },
    contact: null,
    pickup: null,
    remark: '',
    user: null
  },

  onShow() {
    this.loadCheckout()
  },

  loadCheckout() {
    this.setData({
      checkout: store.getCheckoutSummary(),
      contact: store.mock.defaultContact,
      pickup: store.mock.pickupInfo,
      user: store.getUser()
    })
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value
    })
  },

  submitOrder() {
    if (!this.data.checkout.items.length) {
      wx.showToast({
        title: '请先选择商品',
        icon: 'none'
      })
      return
    }

    if (!this.data.user.loggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '登录后才能提交订单。',
        confirmText: '立即登录',
        confirmColor: '#1ecb3a',
        success: (res) => {
          if (res.confirm) {
            store.login()
            this.loadCheckout()
          }
        }
      })
      return
    }

    const result = store.createOrderFromCheckout(this.data.remark)

    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '订单提交成功',
      content: '订单已进入待发货状态，可在“我的-待发货”中查看。',
      confirmText: '查看订单',
      cancelText: '回到首页',
      confirmColor: '#1ecb3a',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/orders/orders?status=pending_ship'
          })
        } else {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
