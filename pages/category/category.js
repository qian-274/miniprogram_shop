const store = require('../../utils/store')

Page({
  data: {
    categories: [],
    activeCategoryId: '',
    activeCategory: null,
    products: []
  },

  async onLoad(options) {
    await store.syncCatalogFromCloud()
    const firstCategory = store.mock.categories[0]
    this.setData({
      categories: store.mock.categories
    })
    this.setActiveCategory(options.categoryId || firstCategory.id)
  },

  setActiveCategory(categoryId) {
    const category = store.mock.getCategory(categoryId)
    const products = store.mock.getProductsByCategory(category.id)

    this.setData({
      activeCategoryId: category.id,
      activeCategory: category,
      products: store.enrichProducts(products)
    })
  },

  selectCategory(event) {
    this.setActiveCategory(event.currentTarget.dataset.id)
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
  }
})
