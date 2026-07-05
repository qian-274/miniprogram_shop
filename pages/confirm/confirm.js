const store = require('../../utils/store')

Page({
  data: {
    checkout: {
      items: [],
      totalText: '0.00'
    },
    contact: null,
    groupText: '',
    groupTitle: '',
    pickup: null,
    remark: '',
    user: null
  },

  onShow() {
    this.loadCheckout()
  },

  loadCheckout() {
    const checkout = store.getCheckoutSummary()
    const firstItem = checkout.items[0] || {}
    const groupTitle = checkout.isGroupOpen
      ? '拼团订单 · 支付并开团'
      : checkout.isGroupJoin
        ? '拼团订单 · 支付并参团'
        : ''
    const groupLeaderName = checkout.targetGroup
      ? (checkout.targetGroup.leaderName || checkout.targetGroup.leaderLabel || '团长')
      : ''
    const groupPrefix = checkout.isGroupJoin && groupLeaderName
      ? `${groupLeaderName}的拼团 · `
      : ''

    this.setData({
      checkout,
      contact: store.mock.defaultContact,
      groupText: checkout.isGroup
        ? `${groupPrefix}${firstItem.groupSizeText || '5 人团'} · 满员后自动进入待发货`
        : '',
      groupTitle,
      pickup: checkout.pickup || store.mock.pickupInfo,
      user: store.getUser()
    })
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value
    })
  },

  submitOrder() {
    if (!this.data.checkout.items.length) {
      wx.showToast({
        title: '请先选择商品',
        icon: 'none'
      })
      return
    }

    if (!this.data.user.loggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '登录后才能提交订单。',
        confirmText: '立即登录',
        confirmColor: '#1ecb3a',
        success: (res) => {
          if (res.confirm) {
            store.login()
            this.loadCheckout()
          }
        }
      })
      return
    }

    const result = store.createOrderFromCheckout(this.data.remark)

    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      })
      return
    }

    if (this.data.checkout.isGroup) {
      const groupSize = result.order && result.order.group ? result.order.group.groupSize : 5
      const isOpen = result.type === 'group_open'

      wx.showModal({
        title: result.completed ? '拼团已成' : (isOpen ? '开团成功' : '参团成功'),
        content: result.completed
          ? `拼团已满 ${groupSize} 人，订单已进入待发货。`
          : `已按拼团价支付，满 ${groupSize} 人后订单自动进入待发货。`,
        confirmText: result.completed ? '查看订单' : '查看拼团',
        cancelText: '回到首页',
        confirmColor: '#1ecb3a',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: result.completed
                ? '/pages/orders/orders?status=pending_ship'
                : `/pages/group/group?groupId=${result.groupId}`
            })
          } else {
            wx.reLaunch({
              url: '/pages/index/index'
            })
          }
        }
      })
      return
    }

    wx.showModal({
      title: '订单提交成功',
      content: '订单已进入待发货状态，可在“我的-待发货”中查看。',
      confirmText: '查看订单',
      cancelText: '回到首页',
      confirmColor: '#1ecb3a',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/orders/orders?status=pending_ship'
          })
        } else {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
