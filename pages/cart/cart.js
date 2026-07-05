const store = require('../../utils/store')

Page({
  data: {
    allSelected: false,
    hasSelected: false,
    isEmpty: false,
    items: [],
    settleButtonText: '结算',
    totalQuantity: 0,
    totalText: '0.00'
  },

  onShow() {
    this.refreshCart()
  },

  refreshCart() {
    const summary = store.getCartSummary()
    this.setData({
      allSelected: summary.allSelected,
      hasSelected: summary.hasSelected,
      isEmpty: summary.isEmpty,
      items: summary.items,
      settleButtonText: summary.totalQuantity ? `结算(${summary.totalQuantity})` : '结算',
      totalQuantity: summary.totalQuantity,
      totalText: summary.totalText
    })
  },

  toggleItem(event) {
    const result = store.toggleCartItem(event.currentTarget.dataset.id)

    if (result.message) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      })
    }

    this.refreshCart()
  },

  toggleAll() {
    store.toggleAllCartItems(!this.data.allSelected)
    this.refreshCart()
  },

  changeQuantity(event) {
    const { id, quantity, delta } = event.currentTarget.dataset
    const result = store.updateCartQuantity(id, Number(quantity) + Number(delta))

    if (result.message) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      })
    }

    this.refreshCart()
  },

  removeItem(event) {
    const { id, name } = event.currentTarget.dataset

    wx.showModal({
      title: '删除商品',
      content: `确定从购物车删除“${name}”吗？`,
      confirmColor: '#ef4a45',
      success: (res) => {
        if (res.confirm) {
          store.removeCartItem(id)
          this.refreshCart()
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${event.currentTarget.dataset.id}`
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  settle() {
    const summary = store.getCartSummary()

    if (!summary.hasSelected) {
      wx.showToast({
        title: '请先选择要结算的商品',
        icon: 'none'
      })
      return
    }

    const selectedItems = summary.items.filter((item) => item.available && item.selected)
    store.setCheckoutItems(selectedItems, 'cart')
    wx.navigateTo({
      url: '/pages/confirm/confirm'
    })
  }
})
