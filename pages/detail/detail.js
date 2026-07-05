const store = require('../../utils/store')

Page({
  data: {
    groupPanelTitle: '',
    groups: [],
    highlightedGroupId: '',
    isFavorite: false,
    product: null,
    quantity: 1
  },

  onLoad(options) {
    this.setData({
      highlightedGroupId: options.groupId || ''
    })
    this.loadProduct(options.id)
  },

  onShow() {
    if (this.data.product) {
      this.loadGroups()
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
    this.loadGroups()
  },

  loadGroups() {
    if (!this.data.product) {
      return
    }

    const groups = store.getVisibleGroups(this.data.product.id)

    this.setData({
      groupPanelTitle: groups.length ? `${groups.length} 个拼团正在进行` : '暂无可参与拼团',
      groups
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

  openGroup() {
    const user = store.getUser()

    if (!user.loggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '登录后才能开团。',
        confirmText: '立即登录',
        confirmColor: '#1ecb3a',
        success: (res) => {
          if (res.confirm) {
            store.login()
          }
        }
      })
      return
    }

    if (!this.data.product.groupEnabled) {
      wx.showToast({
        title: '该商品暂不支持团购',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/pickup/pickup?productId=${this.data.product.id}&quantity=${this.data.quantity}`
    })
  },

  joinGroup(event) {
    const groupId = event.currentTarget.dataset.id
    const group = this.data.groups.find((item) => item.id === groupId)

    if (!group) {
      wx.showToast({
        title: '该拼团已不可参与',
        icon: 'none'
      })
      this.loadGroups()
      return
    }

    if (!group.canJoin) {
      wx.navigateTo({
        url: `/pages/group/group?groupId=${group.id}`
      })
      return
    }

    const result = store.setGroupCheckout({
      mode: 'group_join',
      productId: this.data.product.id,
      quantity: this.data.quantity,
      groupId,
      pickupId: group.pickup.id
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
  },

  goGroup(event) {
    wx.navigateTo({
      url: `/pages/group/group?groupId=${event.currentTarget.dataset.id}`
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
  },

  onShareAppMessage(event) {
    const groupId = event.target && event.target.dataset ? event.target.dataset.id : ''
    const group = groupId ? store.getGroupById(groupId) : null
    const product = this.data.product

    return {
      title: group
        ? `${product.name} 拼团价 ¥${group.groupPriceText}，还差 ${group.remaining} 人`
        : `${product.name} 社区生鲜团购`,
      path: `/pages/detail/detail?id=${product.id}${groupId ? `&groupId=${groupId}` : ''}`,
      imageUrl: product.image
    }
  }
})
