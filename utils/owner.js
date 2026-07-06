const store = require('./store')

const OWNER_PICKUP_KEY = 'fresh_owner_pickup_override'

const STATUS_TEXT = {
  pending_group: '拼团中',
  pending_ship: '待备货',
  pending_receive: '待自提',
  pending_comment: '已提货',
  completed: '已完成'
}

function canUseCloudFunction() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction
}

function getStorage(key, fallback) {
  const value = wx.getStorageSync(key)
  return value === undefined || value === null || value === '' ? fallback : value
}

function setStorage(key, value) {
  wx.setStorageSync(key, value)
}

function getFallbackPickup() {
  return {
    ...store.mock.pickupInfo,
    ...getStorage(OWNER_PICKUP_KEY, {})
  }
}

function getOrderItems(order) {
  return (order.items || []).map((item) => ({
    productId: item.productId || item.id || '',
    name: item.name || item.productName || '未命名商品',
    spec: item.spec || '',
    image: item.image || '',
    quantity: Number(item.quantity || item.cartQuantity || 1),
    price: Number(item.price || item.checkoutPrice || item.groupPrice || item.priceText || 0),
    priceText: store.money(item.price || item.checkoutPrice || item.groupPrice || 0)
  }))
}

function normalizeFallbackOrder(order) {
  const items = getOrderItems(order)
  const total = Number(order.total || items.reduce((sum, item) => sum + item.price * item.quantity, 0))

  return {
    id: order.id,
    orderId: order.id,
    status: order.status,
    statusText: order.statusText || STATUS_TEXT[order.status] || '待处理',
    name: order.contact && order.contact.name ? order.contact.name : '演示用户',
    phone: order.contact && order.contact.phone ? order.contact.phone : '13800000000',
    address: order.contact && (order.contact.address || order.contact.detail) ? (order.contact.address || order.contact.detail) : '',
    remark: order.remark || '',
    time: order.time || '',
    totalText: order.totalText || store.money(total),
    canPickup: order.status === 'pending_receive',
    items
  }
}

function getFallbackOrders() {
  return store.getOrders().map(normalizeFallbackOrder)
}

function buildStats(orders) {
  return {
    totalOrders: orders.length,
    preparingOrders: orders.filter((order) => order.status === 'pending_ship').length,
    readyOrders: orders.filter((order) => order.status === 'pending_receive').length,
    pickedOrders: orders.filter((order) => ['pending_comment', 'completed'].includes(order.status)).length,
    itemCount: orders.reduce((sum, order) => (
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    ), 0)
  }
}

function buildProductSummary(orders) {
  const map = {}

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productId || item.name
      const current = map[key] || {
        productId: key,
        name: item.name,
        image: item.image,
        spec: item.spec,
        totalQuantity: 0,
        orderCount: 0,
        statuses: {}
      }

      current.totalQuantity += item.quantity
      current.orderCount += 1
      current.statuses[order.status] = (current.statuses[order.status] || 0) + 1
      map[key] = current
    })
  })

  return Object.values(map)
    .sort((left, right) => right.totalQuantity - left.totalQuantity)
    .map((item) => ({
      ...item,
      statusText: Object.keys(item.statuses)
        .map((status) => `${STATUS_TEXT[status] || status} ${item.statuses[status]}`)
        .join(' / ')
    }))
}

function filterOrders(orders, payload = {}) {
  const status = payload.status && payload.status !== 'all' ? payload.status : ''
  const keyword = String(payload.keyword || '').trim().toLowerCase()

  return orders.filter((order) => {
    if (status && order.status !== status) {
      return false
    }

    if (!keyword) {
      return true
    }

    const text = [
      order.id,
      order.name,
      order.phone,
      order.remark,
      ...order.items.map((item) => item.name)
    ].join(' ').toLowerCase()

    return text.includes(keyword)
  })
}

function fallbackResponse(action, payload = {}) {
  const pickup = getFallbackPickup()
  const orders = getFallbackOrders()

  if (action === 'getPickup') {
    return {
      ok: true,
      canManage: true,
      demo: true,
      pickup
    }
  }

  if (action === 'updatePickup') {
    const nextPickup = {
      ...pickup,
      ...(payload.pickup || payload)
    }

    setStorage(OWNER_PICKUP_KEY, nextPickup)

    return {
      ok: true,
      canManage: true,
      demo: true,
      pickup: nextPickup
    }
  }

  if (action === 'markPickedUp') {
    if (payload.orderId) {
      store.updateOrderStatus(payload.orderId, 'pending_comment')
    }

    return {
      ok: true,
      canManage: true,
      demo: true
    }
  }

  if (action === 'getProducts') {
    const filtered = filterOrders(orders, payload)

    return {
      ok: true,
      canManage: true,
      demo: true,
      pickup,
      stats: buildStats(filtered),
      products: buildProductSummary(filtered)
    }
  }

  if (action === 'getRecipients') {
    return {
      ok: true,
      canManage: true,
      demo: true,
      pickup,
      orders: filterOrders(orders, payload)
    }
  }

  return {
    ok: true,
    canManage: true,
    demo: true,
    pickup,
    stats: buildStats(orders),
    products: buildProductSummary(orders).slice(0, payload.lite ? 3 : 8),
    recentOrders: orders.slice(0, payload.lite ? 3 : 8)
  }
}

async function callOwner(action, payload = {}, options = {}) {
  if (canUseCloudFunction()) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'ownerApi',
        data: {
          action,
          payload
        }
      })

      if (result && result.result) {
        return result.result
      }
    } catch (error) {
      if (options.noFallback) {
        return {
          ok: false,
          message: error && (error.errMsg || error.message) ? (error.errMsg || error.message) : '店主服务暂不可用'
        }
      }
    }
  }

  if (options.noFallback) {
    return {
      ok: false,
      message: '店主服务暂不可用'
    }
  }

  return fallbackResponse(action, payload)
}

function getDashboard(payload, options) {
  return callOwner('getDashboard', payload, options)
}

function getProducts(payload, options) {
  return callOwner('getProducts', payload, options)
}

function getRecipients(payload, options) {
  return callOwner('getRecipients', payload, options)
}

function getPickup(payload, options) {
  return callOwner('getPickup', payload, options)
}

function updatePickup(pickup, options) {
  return callOwner('updatePickup', { pickup }, options)
}

function markPickedUp(orderId, options) {
  return callOwner('markPickedUp', { orderId }, options)
}

module.exports = {
  getDashboard,
  getPickup,
  getProducts,
  getRecipients,
  markPickedUp,
  updatePickup
}
