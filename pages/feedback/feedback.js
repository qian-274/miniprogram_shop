const store = require('../../utils/store')

Page({
  data: {
    content: ''
  },

  onInput(event) {
    this.setData({
      content: event.detail.value
    })
  },

  submit() {
    const content = this.data.content.trim()

    if (!content) {
      wx.showToast({
        title: '请填写反馈内容',
        icon: 'none'
      })
      return
    }

    store.addFeedback(content)
    this.setData({
      content: ''
    })
    wx.showModal({
      title: '提交成功',
      content: '感谢反馈，我们会在后续优化中参考你的建议。',
      showCancel: false,
      confirmColor: '#1ecb3a'
    })
  }
})
