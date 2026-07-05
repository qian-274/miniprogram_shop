const store = require('../../utils/store')

Page({
  data: {
    keyword: '',
    products: []
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')
    this.setData({ keyword })
    this.search(keyword)
  },

  onKeywordInput(event) {
    this.setData({
      keyword: event.detail.value
    })
  },

  onSearchConfirm(event) {
    const keyword = String(event.detail.value || this.data.keyword || '').trim()

    if (!keyword) {
      wx.showToast({
        title: '请输入商品关键词',
        icon: 'none'
      })
      return
    }

    this.search(keyword)
  },

  search(keyword) {
    wx.setNavigationBarTitle({
      title: `搜索：${keyword}`
    })
    this.setData({
      keyword,
      products: store.enrichProducts(store.mock.searchProducts(keyword))
    })
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}`
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
