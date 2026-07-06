const store = require('../../utils/store')

Page({
  data: {
    group: null,
    groupId: ''
  },

  onLoad(options) {
    this.setData({
      groupId: options.groupId || ''
    })
  },

  async onShow() {
    await store.syncSharedData()
    this.loadGroup()
    this.startSyncTimer()
  },

  onHide() {
    this.stopSyncTimer()
  },

  onUnload() {
    this.stopSyncTimer()
  },

  loadGroup() {
    const group = store.getGroupById(this.data.groupId)

    if (!group) {
      wx.setNavigationBarTitle({
        title: '拼团不存在'
      })
      return
    }

    wx.setNavigationBarTitle({
      title: group.isMine ? '我的拼团' : '拼团详情'
    })

    this.setData({ group })
  },

  startSyncTimer() {
    this.stopSyncTimer()
    this.syncTimer = setInterval(async () => {
      await store.syncSharedData()
      this.loadGroup()
    }, 5000)
  },

  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  },

  goDetail() {
    if (!this.data.group) {
      return
    }

    wx.redirectTo({
      url: `/pages/detail/detail?id=${this.data.group.productId}&groupId=${this.data.group.id}`
    })
  },

  invite() {
    wx.showToast({
      title: '请点击右上角分享给好友',
      icon: 'none'
    })
  },

  onShareAppMessage() {
    const group = this.data.group

    if (!group) {
      return {}
    }

    return {
      title: `${group.product.name} 拼团价 ¥${group.groupPriceText}，还差 ${group.remaining} 人`,
      path: `/pages/detail/detail?id=${group.productId}&groupId=${group.id}`,
      imageUrl: group.product.image
    }
  }
})
