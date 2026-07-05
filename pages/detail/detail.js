const store = require('../../utils/store')

Page({
  data: {
    isFavorite: false,
    product: null,
    quantity: 1
  },

  onLoad(options) {
    this.loadProduct(options.id)
  },

  onShow() {
    if (this.data.product) {
      this.setData({
        isFavorite: store.isFavorite(this.data.product.id)
      })
    }
  },

  loadProduct(id) {
    const product = store.enrichProduct(store.mock.getProduct(id))

    if (!product) {
      wx.setNavigationBarTitle({
        title: '商品不存在'
      })
      return
    }

    wx.setNavigationBarTitle({
      title: product.name
    })
    this.setData({
      isFavorite: store.isFavorite(product.id),
      product,
      quantity: 1
    })
  },

  changeQuantity(event) {
    const delta = Number(event.currentTarget.dataset.delta)
    const product = this.data.product
    const limit = Math.max(1, Math.min(product.stock || 1, product.limit || product.stock || 1))
    const nextQuantity = Math.max(1, Math.min(this.data.quantity + delta, limit))

    if (nextQuantity === this.data.quantity && delta > 0) {
      wx.showToast({
        title: `最多可购买 ${limit} 份`,
        icon: 'none'
      })
    }

    this.setData({
      quantity: nextQuantity
    })
  },

  toggleFavorite() {
    const user = store.getUser()

    if (!user.loggedIn) {
      wx.showToast({
        title: '登录后可收藏商品',
        icon: 'none'
      })
      return
    }

    const favorite = store.toggleFavorite(this.data.product.id)
    this.setData({
      isFavorite: favorite
    })
    wx.showToast({
      title: favorite ? '已收藏' : '已取消收藏',
      icon: 'success'
    })
  },

  addCart() {
    const result = store.addToCart(this.data.product.id, this.data.quantity)

    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    })
  },

  buyNow() {
    if (!this.data.product.available) {
      wx.showToast({
        title: '该商品暂时不可购买',
        icon: 'none'
      })
      return
    }

    store.setCheckoutItems([
      {
        productId: this.data.product.id,
        quantity: this.data.quantity
      }
    ], 'direct')
    wx.navigateTo({
      url: '/pages/confirm/confirm'
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  goCart() {
    wx.reLaunch({
      url: '/pages/cart/cart'
    })
  }
})
