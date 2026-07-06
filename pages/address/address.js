const store = require('../../utils/store')

Page({
  data: {
    form: {
      name: '',
      phone: '',
      detail: ''
    },
    user: null
  },

  onShow() {
    const address = store.getUserAddress()

    this.setData({
      form: {
        name: address.name || '',
        phone: address.phone || '',
        detail: address.detail || ''
      },
      user: store.getUser()
    })
  },

  onNameInput(event) {
    this.setData({
      'form.name': event.detail.value
    })
  },

  onPhoneInput(event) {
    this.setData({
      'form.phone': event.detail.value
    })
  },

  onDetailInput(event) {
    this.setData({
      'form.detail': event.detail.value
    })
  },

  saveAddress() {
    const name = String(this.data.form.name || '').trim()
    const phone = String(this.data.form.phone || '').trim()
    const detail = String(this.data.form.detail || '').trim()

    if (!name) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      })
      return
    }

    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确手机号',
        icon: 'none'
      })
      return
    }

    if (!detail) {
      wx.showToast({
        title: '请输入收货地址',
        icon: 'none'
      })
      return
    }

    store.saveUserAddress({
      name,
      phone,
      detail
    })

    wx.showToast({
      title: '地址已保存',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack({
        fail: () => {
          wx.reLaunch({
            url: '/pages/profile/profile'
          })
        }
      })
    }, 450)
  }
})
