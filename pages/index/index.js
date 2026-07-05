const store = require('../../utils/store')

Page({
  data: {
    banners: [],
    categories: [],
    featuredProducts: [],
    groupProducts: [],
    keyword: '',
    pickupText: ''
  },

  onLoad() {
    this.loadHome()
  },

  loadHome() {
    const { mock } = store
    const groupProducts = mock.products.filter((item) => item.group).slice(0, 4)
    const featuredProducts = mock.products.filter((item) => item.featured).slice(0, 5)

    this.setData({
      banners: mock.banners,
      categories: mock.categories,
      groupProducts: store.enrichProducts(groupProducts),
      featuredProducts: store.enrichProducts(featuredProducts),
      pickupText: `${mock.pickupInfo.name} · ${mock.pickupInfo.time}`
    })
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

    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
    })
  },

  goCategory(event) {
    const { id } = event.currentTarget.dataset
    wx.reLaunch({
      url: `/pages/category/category?categoryId=${id}`
    })
  },

  goDetail(event) {
    const { id } = event.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  addCart(event) {
    const { id } = event.currentTarget.dataset
    const result = store.addToCart(id, 1)

    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    })
  }
})
