const store = require('../../utils/store')

Page({
  data: {
    orderStatuses: [],
    user: {
      loggedIn: false,
      nickName: '未登录用户',
      avatarText: '访'
    }
  },

  onShow() {
    this.refreshProfile()
  },

  refreshProfile() {
    const counts = store.getOrderCounts()
    const orderStatuses = store.mock.orderStatuses.map((item) => ({
      ...item,
      count: counts[item.key] || 0
    }))

    this.setData({
      orderStatuses,
      user: store.getUser()
    })
  },

  login() {
    store.login()
    this.refreshProfile()
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    })
  },

  ensureLogin() {
    if (this.data.user && this.data.user.loggedIn) {
      return true
    }

    wx.showModal({
      title: '需要登录',
      content: '登录后可查看订单、收藏和提交反馈。',
      confirmText: '立即登录',
      confirmColor: '#1ecb3a',
      success: (res) => {
        if (res.confirm) {
          this.login()
        }
      }
    })

    return false
  },

  goOrders(event) {
    if (!this.ensureLogin()) {
      return
    }

    const status = event.currentTarget.dataset.status || 'all'

    wx.navigateTo({
      url: `/pages/orders/orders?status=${status}`
    })
  },

  goFavorites() {
    if (!this.ensureLogin()) {
      return
    }

    wx.navigateTo({
      url: '/pages/favorites/favorites'
    })
  },

  goService() {
    wx.navigateTo({
      url: '/pages/service/service'
    })
  },

  goFeedback() {
    if (!this.ensureLogin()) {
      return
    }

    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  logout() {
    if (!this.data.user || !this.data.user.loggedIn) {
      wx.showToast({
        title: '当前未登录',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '退出后将回到未登录状态，确定继续吗？',
      confirmColor: '#ef4a45',
      success: (res) => {
        if (res.confirm) {
          store.logout()
          this.refreshProfile()
          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  }
})
