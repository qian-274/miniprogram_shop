const store = require('../../utils/store')

Page({
  data: {
    activeStatus: 'all',
    orders: [],
    statusTabs: []
  },

  onLoad(options) {
    const activeStatus = options.status && options.status !== 'undefined' ? options.status : 'all'
    this.setData({
      activeStatus,
      statusTabs: [
        { key: 'all', name: '全部' },
        ...store.mock.orderStatuses
      ]
    })
  },

  async onShow() {
    await store.syncSharedData()
    this.loadOrders()
  },

  loadOrders() {
    const status = this.data.activeStatus === 'all' ? '' : this.data.activeStatus
    this.setData({
      orders: store.getOrders(status)
    })
  },

  selectStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status
    })
    this.loadOrders()
  },

  handleAction(event) {
    const { id, status } = event.currentTarget.dataset
    const order = this.data.orders.find((item) => item.id === id)

    if (status === 'pending_group' && order && order.groupId) {
      wx.navigateTo({
        url: `/pages/group/group?groupId=${order.groupId}`
      })
      return
    }

    if (status === 'pending_receive') {
      wx.showModal({
        title: '确认收货',
        content: '确认已经在自提点取到商品了吗？',
        confirmColor: '#1ecb3a',
        success: (res) => {
          if (res.confirm) {
            store.updateOrderStatus(id, 'pending_comment')
            this.loadOrders()
            wx.showToast({
              title: '已确认收货',
              icon: 'success'
            })
          }
        }
      })
      return
    }

    if (status === 'pending_comment') {
      store.updateOrderStatus(id, 'completed')
      this.loadOrders()
      wx.showToast({
        title: '评价完成',
        icon: 'success'
      })
      return
    }

    this.showDetail(event)
  },

  showDetail(event) {
    const order = this.data.orders.find((item) => item.id === event.currentTarget.dataset.id)

    if (!order) {
      return
    }

    wx.showModal({
      title: order.id,
      content: `${order.statusText}｜${order.pickup}｜共 ${order.count} 件，合计 ¥${order.totalText}${order.isGroup ? `｜拼团 ${order.groupProgressText}` : ''}`,
      showCancel: false,
      confirmColor: '#1ecb3a'
    })
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  }
})
