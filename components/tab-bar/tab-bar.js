Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },
  data: {
    tabs: [
      { key: 'home', text: '首页', icon: '⌂', url: '/pages/index/index' },
      { key: 'category', text: '分类', icon: '▦', url: '/pages/category/category' },
      { key: 'cart', text: '购物车', icon: '▣', url: '/pages/cart/cart' },
      { key: 'profile', text: '我的', icon: '人', url: '/pages/profile/profile' }
    ]
  },
  methods: {
    onSwitch(event) {
      const { key, url } = event.currentTarget.dataset

      if (key === this.properties.active) {
        return
      }

      wx.reLaunch({ url })
    }
  }
})
