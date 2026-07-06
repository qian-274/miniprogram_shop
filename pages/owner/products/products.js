const ownerApi = require('../../../utils/owner')

Page({
  data: {
    activeStatus: 'all',
    canManage: false,
    error: '',
    loading: true,
    pickup: null,
    products: [],
    stats: {},
    statusTabs: [
      { key: 'all', name: '全部' },
      { key: 'pending_ship', name: '待备货' },
      { key: 'pending_receive', name: '待自提' },
      { key: 'pending_comment', name: '已提货' }
    ]
  },

  onShow() {
    this.loadProducts()
  },

  async loadProducts() {
    this.setData({
      loading: true,
      error: ''
    })

    const result = await ownerApi.getProducts({
      status: this.data.activeStatus
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
      products: result.products || [],
      stats: result.stats || {},
      loading: false
    })
  },

  selectStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status
    })
    this.loadProducts()
  }
})
