const ownerApi = require('../../../utils/owner')

Page({
  data: {
    activeStatus: 'all',
    canManage: false,
    error: '',
    keyword: '',
    loading: true,
    orders: [],
    pickup: null,
    statusTabs: [
      { key: 'all', name: '全部' },
      { key: 'pending_ship', name: '待备货' },
      { key: 'pending_receive', name: '待自提' },
      { key: 'pending_comment', name: '已提货' }
    ]
  },

  onShow() {
    this.loadRecipients()
  },

  async loadRecipients() {
    this.setData({
      loading: true,
      error: ''
    })

    const result = await ownerApi.getRecipients({
      status: this.data.activeStatus,
      keyword: this.data.keyword
    })

    if (!result.ok || !result.canManage) {
      this.setData({
        canManage: false,
        error: result.message || '当前账号未绑定自提点',
        loading: false
      })
      return
    }

    this.setData({
      canManage: true,
      pickup: result.pickup,
      orders: result.orders || [],
      loading: false
    })
  },

  onKeywordInput(event) {
    this.setData({
      keyword: event.detail.value
    })
  },

  onSearchConfirm() {
    this.loadRecipients()
  },

  clearSearch() {
    this.setData({
      keyword: ''
    })
    this.loadRecipients()
  },

  selectStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status
    })
    this.loadRecipients()
  },

  markPickedUp(event) {
    const { id } = event.currentTarget.dataset
    const order = this.data.orders.find((item) => item.orderId === id || item.id === id)

    if (!order || !order.canPickup) {
      wx.showToast({
        title: '当前订单不可提货',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认已提货',
      content: `确认 ${order.name} 的订单已在自提点完成提货吗？`,
      confirmColor: '#1ecb3a',
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '更新中',
          mask: true
        })
        const result = await ownerApi.markPickedUp(id)
        wx.hideLoading()

        if (!result.ok) {
          wx.showToast({
            title: result.message || '更新失败',
            icon: 'none'
          })
          return
        }

        wx.showToast({
          title: '已标记提货',
          icon: 'success'
        })
        this.loadRecipients()
      }
    })
  }
})
