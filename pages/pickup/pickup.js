const store = require('../../utils/store')

Page({
  data: {
    pickupPoints: [],
    product: null,
    quantity: 1,
    selectedPickupId: ''
  },

  onLoad(options) {
    const product = store.enrichProduct(store.mock.getProduct(options.productId))

    this.setData({
      pickupPoints: store.mock.pickupPoints,
      product,
      quantity: Number(options.quantity) || 1,
      selectedPickupId: store.mock.pickupInfo.id
    })
  },

  selectPickup(event) {
    this.setData({
      selectedPickupId: event.currentTarget.dataset.id
    })
  },

  confirmPickup() {
    if (!this.data.selectedPickupId) {
      wx.showToast({
        title: '请选择自提点',
        icon: 'none'
      })
      return
    }

    const result = store.setGroupCheckout({
      mode: 'group_open',
      productId: this.data.product.id,
      quantity: this.data.quantity,
      pickupId: this.data.selectedPickupId
    })

    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/confirm/confirm'
    })
  }
})
