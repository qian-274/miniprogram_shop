const ownerApi = require('../../../utils/owner')

Page({
  data: {
    canManage: false,
    error: '',
    form: {
      name: '',
      address: '',
      serviceTime: '',
      phone: '',
      notice: ''
    },
    loading: true,
    saving: false
  },

  onLoad() {
    this.loadPickup()
  },

  async loadPickup() {
    this.setData({
      loading: true,
      error: ''
    })

    const result = await ownerApi.getPickup()

    if (!result.ok || !result.canManage) {
      this.setData({
        canManage: false,
        error: result.message || '当前账号未绑定自提点',
        loading: false
      })
      return
    }

    const pickup = result.pickup || {}

    this.setData({
      canManage: true,
      form: {
        name: pickup.name || '',
        address: pickup.address || '',
        serviceTime: pickup.serviceTime || pickup.time || '',
        phone: pickup.phone || '',
        notice: pickup.notice || ''
      },
      loading: false
    })
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset

    this.setData({
      [`form.${field}`]: event.detail.value
    })
  },

  async saveSettings() {
    const form = this.data.form

    if (!String(form.address || '').trim()) {
      wx.showToast({
        title: '请填写自提点地址',
        icon: 'none'
      })
      return
    }

    if (!String(form.serviceTime || '').trim()) {
      wx.showToast({
        title: '请填写营业时间',
        icon: 'none'
      })
      return
    }

    this.setData({
      saving: true
    })
    wx.showLoading({
      title: '保存中',
      mask: true
    })

    const result = await ownerApi.updatePickup({
      address: form.address,
      serviceTime: form.serviceTime,
      phone: form.phone,
      notice: form.notice
    })

    wx.hideLoading()
    this.setData({
      saving: false
    })

    if (!result.ok) {
      wx.showToast({
        title: result.message || '保存失败',
        icon: 'none'
      })
      return
    }

    wx.showToast({
      title: '已保存',
      icon: 'success'
    })
    this.loadPickup()
  }
})
