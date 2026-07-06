const ownerApi = require('../../../utils/owner')

Page({
  data: {
    canManage: false,
    demo: false,
    error: '',
    loading: true,
    pickup: null,
    products: [],
    recentOrders: [],
    stats: {
      totalOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      pickedOrders: 0,
      itemCount: 0
    }
  },

  onShow() {
    this.loadDashboard()
  },

  async loadDashboard() {
    this.setData({
      loading: true,
      error: ''
    })

    const result = await ownerApi.getDashboard()

    if (!result.ok || !result.canManage) {
      this.setData({
        canManage: false,
        error: result.message || '当前账号未绑定自提点',
        loading: false
      })
      return
    }

    this.setData({
      canManage: true,
      demo: !!result.demo,
      pickup: result.pickup,
      products: result.products || [],
      recentOrders: result.recentOrders || [],
      stats: result.stats || this.data.stats,
      loading: false
    })
  },

  goProducts() {
    wx.navigateTo({
      url: '/pages/owner/products/products'
    })
  },

  goRecipients() {
    wx.navigateTo({
      url: '/pages/owner/recipients/recipients'
    })
  },

  goSettings() {
    wx.navigateTo({
      url: '/pages/owner/settings/settings'
    })
  },

  goProfile() {
    wx.reLaunch({
      url: '/pages/profile/profile'
    })
  }
})
