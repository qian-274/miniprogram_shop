const store = require('../../utils/store')

Page({
  data: {
    products: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData({
      products: store.getFavoriteProducts()
    })
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}`
    })
  },

  removeFavorite(event) {
    store.toggleFavorite(event.currentTarget.dataset.id)
    this.refresh()
    wx.showToast({
      title: '已取消收藏',
      icon: 'success'
    })
  },

  addCart(event) {
    const result = store.addToCart(event.currentTarget.dataset.id, 1)
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
