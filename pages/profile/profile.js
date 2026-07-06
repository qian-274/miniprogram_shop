const store = require('../../utils/store')

Page({
  data: {
    orderStatuses: [],
    profileForm: {
      avatarUrl: '',
      nickName: ''
    },
    showProfileEditor: false,
    user: {
      loggedIn: false,
      nickName: '未登录用户',
      avatarText: '访'
    }
  },

  async onShow() {
    await store.syncSharedData()
    this.refreshProfile()
  },

  refreshProfile() {
    const user = store.getUser()
    const counts = store.getOrderCounts()
    const orderStatuses = store.mock.orderStatuses.map((item) => ({
      ...item,
      count: counts[item.key] || 0
    }))

    this.setData({
      orderStatuses,
      profileForm: {
        avatarUrl: this.data.profileForm.avatarUrl || user.avatarUrl || '',
        nickName: this.data.profileForm.nickName || (user.profileSynced ? user.nickName : '')
      },
      showProfileEditor: !user.loggedIn || !user.profileSynced,
      user
    })
  },

  login() {
    this.setData({
      showProfileEditor: true
    })
  },

  editProfile() {
    this.setData({
      profileForm: {
        avatarUrl: this.data.user.avatarUrl || '',
        nickName: this.data.user.profileSynced ? this.data.user.nickName : ''
      },
      showProfileEditor: true
    })
  },

  onChooseAvatar(event) {
    this.setData({
      'profileForm.avatarUrl': event.detail.avatarUrl
    })
  },

  onNicknameInput(event) {
    this.setData({
      'profileForm.nickName': event.detail.value
    })
  },

  async saveWechatProfile() {
    const nickName = String(this.data.profileForm.nickName || '').trim()

    if (!nickName) {
      wx.showToast({
        title: '请输入微信昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '登录中',
      mask: true
    })
    const identity = await store.prepareCloudIdentity()
    if (identity.ok) {
      await store.syncSharedData()
    }
    wx.hideLoading()

    store.loginWithProfile({
      nickName,
      avatarUrl: this.data.profileForm.avatarUrl,
      openid: identity.ok ? identity.openid : ''
    })
    this.refreshProfile()
    this.setData({
      showProfileEditor: false
    })

    if (!identity.ok) {
      wx.showModal({
        title: '云端身份未就绪',
        content: identity.message,
        showCancel: false,
        confirmColor: '#1ecb3a'
      })
      return
    }

    wx.showToast({
      title: '资料已同步',
      icon: 'success'
    })
  },

  ensureLogin() {
    if (this.data.user && this.data.user.loggedIn) {
      return true
    }

    wx.showModal({
      title: '需要登录',
      content: '登录后可查看订单、收藏和提交反馈。',
      confirmText: '立即登录',
      confirmColor: '#1ecb3a',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            showProfileEditor: true
          })
        }
      }
    })

    return false
  },

  goOrders(event) {
    if (!this.ensureLogin()) {
      return
    }

    const status = event.currentTarget.dataset.status || 'all'

    wx.navigateTo({
      url: `/pages/orders/orders?status=${status}`
    })
  },

  goFavorites() {
    if (!this.ensureLogin()) {
      return
    }

    wx.navigateTo({
      url: '/pages/favorites/favorites'
    })
  },

  goAddress() {
    if (!this.ensureLogin()) {
      return
    }

    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  goService() {
    wx.navigateTo({
      url: '/pages/service/service'
    })
  },

  goFeedback() {
    if (!this.ensureLogin()) {
      return
    }

    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  logout() {
    if (!this.data.user || !this.data.user.loggedIn) {
      wx.showToast({
        title: '当前未登录',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '退出后将回到未登录状态，确定继续吗？',
      confirmColor: '#ef4a45',
      success: (res) => {
        if (res.confirm) {
          store.logout()
          this.refreshProfile()
          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  }
})
