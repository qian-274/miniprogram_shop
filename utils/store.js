const mock = require('./mock-data')

const CART_KEY = 'fresh_cart'
const CART_INIT_KEY = 'fresh_cart_initialized'
const CHECKOUT_KEY = 'fresh_checkout'
const FAVORITES_KEY = 'fresh_favorites'
const FAVORITES_INIT_KEY = 'fresh_favorites_initialized'
const ORDERS_KEY = 'fresh_orders'
const ORDERS_INIT_KEY = 'fresh_orders_initialized'
const USER_KEY = 'fresh_user'
const FEEDBACK_KEY = 'fresh_feedback'

function money(value) {
  return Number(value || 0).toFixed(2)
}

function getStorage(key, fallback) {
  const value = wx.getStorageSync(key)
  return value === undefined || value === null || value === '' ? fallback : value
}

function setStorage(key, value) {
  wx.setStorageSync(key, value)
}

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatTime(date) {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getLimit(product) {
  if (!product) {
    return 1
  }

  const stock = product.stock || 0
  const limit = product.limit || stock || 1
  return Math.max(1, Math.min(stock || limit, limit))
}

function isProductAvailable(product) {
  return !!product && product.status === 'available' && product.stock > 0
}

function ensureCart() {
  if (!getStorage(CART_INIT_KEY, false)) {
    setStorage(CART_KEY, [
      { productId: 'grape', quantity: 2, selected: true },
      { productId: 'orange', quantity: 1, selected: true },
      { productId: 'eggs', quantity: 1, selected: false }
    ])
    setStorage(CART_INIT_KEY, true)
  }
}

function getCartRaw() {
  ensureCart()
  return getStorage(CART_KEY, [])
}

function saveCartRaw(items) {
  setStorage(CART_KEY, items)
}

function enrichProduct(product) {
  if (!product) {
    return null
  }

  const category = mock.getCategory(product.categoryId)
  const available = isProductAvailable(product)

  return {
    ...product,
    available,
    categoryName: category ? category.name : '',
    priceText: money(product.price),
    originalPriceText: money(product.originalPrice),
    stockText: available ? `剩余 ${product.stock} 份` : '暂时售罄',
    statusText: available ? '可购买' : '暂时售罄'
  }
}

function enrichProducts(products) {
  return products.map(enrichProduct).filter(Boolean)
}

function enrichCartItem(item) {
  const product = mock.getProduct(item.productId)

  if (!product) {
    return null
  }

  const available = isProductAvailable(product)
  const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, getLimit(product)))
  const subtotal = product.price * quantity

  return {
    ...enrichProduct(product),
    productId: product.id,
    cartQuantity: quantity,
    selected: available ? !!item.selected : false,
    subtotal,
    subtotalText: money(subtotal),
    disabledText: available ? '' : '暂时售罄，不参与结算'
  }
}

function getCartSummary() {
  const items = getCartRaw().map(enrichCartItem).filter(Boolean)
  const availableItems = items.filter((item) => item.available)
  const selectedItems = items.filter((item) => item.available && item.selected)
  const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0)
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.cartQuantity, 0)

  return {
    items,
    isEmpty: items.length === 0,
    allSelected: availableItems.length > 0 && availableItems.every((item) => item.selected),
    hasSelected: selectedItems.length > 0,
    selectedCount: selectedItems.length,
    total,
    totalText: money(total),
    totalQuantity
  }
}

function addToCart(productId, quantity = 1) {
  const product = mock.getProduct(productId)

  if (!isProductAvailable(product)) {
    return { ok: false, message: '该商品暂时不可购买' }
  }

  const raw = getCartRaw()
  const index = raw.findIndex((item) => item.productId === productId)
  const limit = getLimit(product)

  if (index >= 0) {
    const nextQuantity = Math.min(limit, raw[index].quantity + quantity)
    raw[index] = {
      ...raw[index],
      quantity: nextQuantity,
      selected: true
    }
  } else {
    raw.push({
      productId,
      quantity: Math.min(limit, quantity),
      selected: true
    })
  }

  saveCartRaw(raw)
  return { ok: true, message: '已加入购物车' }
}

function updateCartQuantity(productId, quantity) {
  const product = mock.getProduct(productId)

  if (!isProductAvailable(product)) {
    return { ok: false, message: '该商品暂时不可购买' }
  }

  const raw = getCartRaw()
  const index = raw.findIndex((item) => item.productId === productId)

  if (index < 0) {
    return { ok: false, message: '购物车中没有该商品' }
  }

  const limit = getLimit(product)
  const nextQuantity = Math.max(1, Math.min(Number(quantity) || 1, limit))
  raw[index] = {
    ...raw[index],
    quantity: nextQuantity
  }
  saveCartRaw(raw)

  if (nextQuantity >= limit && quantity > limit) {
    return { ok: true, message: `最多可购买 ${limit} 份` }
  }

  return { ok: true }
}

function toggleCartItem(productId) {
  const raw = getCartRaw()
  const index = raw.findIndex((item) => item.productId === productId)

  if (index < 0) {
    return { ok: false }
  }

  const product = mock.getProduct(productId)

  if (!isProductAvailable(product)) {
    return { ok: false, message: '售罄商品不能勾选' }
  }

  raw[index] = {
    ...raw[index],
    selected: !raw[index].selected
  }
  saveCartRaw(raw)

  return { ok: true }
}

function toggleAllCartItems(selected) {
  const raw = getCartRaw().map((item) => {
    const product = mock.getProduct(item.productId)
    return isProductAvailable(product)
      ? { ...item, selected }
      : { ...item, selected: false }
  })

  saveCartRaw(raw)
}

function removeCartItem(productId) {
  saveCartRaw(getCartRaw().filter((item) => item.productId !== productId))
}

function removeSelectedCartItems(productIds) {
  const ids = productIds || getCartSummary().items
    .filter((item) => item.available && item.selected)
    .map((item) => item.productId)

  saveCartRaw(getCartRaw().filter((item) => !ids.includes(item.productId)))
}

function setCheckoutItems(items, source) {
  const normalized = items.map((item) => ({
    productId: item.productId || item.id,
    quantity: item.cartQuantity || item.quantity || 1
  })).filter((item) => item.productId)

  setStorage(CHECKOUT_KEY, {
    source: source || 'cart',
    items: normalized
  })
}

function getCheckoutSummary() {
  const checkout = getStorage(CHECKOUT_KEY, { source: 'cart', items: [] })
  const items = (checkout.items || []).map((item) => {
    const product = mock.getProduct(item.productId)

    if (!isProductAvailable(product)) {
      return null
    }

    const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, getLimit(product)))
    const subtotal = product.price * quantity

    return {
      ...enrichProduct(product),
      productId: product.id,
      quantity,
      subtotal,
      subtotalText: money(subtotal)
    }
  }).filter(Boolean)
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  return {
    source: checkout.source || 'cart',
    items,
    total,
    totalText: money(total)
  }
}

function ensureOrders() {
  if (!getStorage(ORDERS_INIT_KEY, false)) {
    setStorage(ORDERS_KEY, [
      {
        id: 'ORD20260705001',
        status: 'pending_receive',
        time: '2026-07-05 09:30',
        pickup: mock.pickupInfo.name,
        remark: '晚一点来取，麻烦留货。',
        items: [
          { productId: 'greens', quantity: 1, price: 19.9 },
          { productId: 'milk', quantity: 2, price: 16.8 }
        ]
      },
      {
        id: 'ORD20260704002',
        status: 'pending_comment',
        time: '2026-07-04 18:20',
        pickup: mock.pickupInfo.name,
        remark: '',
        items: [
          { productId: 'banana', quantity: 1, price: 18.9 }
        ]
      },
      {
        id: 'ORD20260703006',
        status: 'completed',
        time: '2026-07-03 17:12',
        pickup: mock.pickupInfo.name,
        remark: '',
        items: [
          { productId: 'tomato', quantity: 2, price: 15.8 },
          { productId: 'oats', quantity: 1, price: 28.8 }
        ]
      }
    ])
    setStorage(ORDERS_INIT_KEY, true)
  }
}

function getOrdersRaw() {
  ensureOrders()
  return getStorage(ORDERS_KEY, [])
}

function saveOrdersRaw(orders) {
  setStorage(ORDERS_KEY, orders)
}

function enrichOrder(order) {
  const status = mock.orderStatuses.find((item) => item.key === order.status) || mock.orderStatuses[0]
  const items = (order.items || []).map((item) => {
    const product = mock.getProduct(item.productId)
    const quantity = Number(item.quantity) || 1
    const price = Number(item.price || (product && product.price) || 0)

    return {
      ...enrichProduct(product),
      productId: item.productId,
      quantity,
      price,
      priceText: money(price),
      subtotalText: money(price * quantity)
    }
  }).filter(Boolean)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    ...order,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    statusText: status.name,
    actionText: status.action,
    total,
    totalText: money(total)
  }
}

function getOrders(status) {
  return getOrdersRaw()
    .filter((order) => !status || order.status === status)
    .map(enrichOrder)
}

function getOrderCounts() {
  const orders = getOrdersRaw()
  return mock.orderStatuses.reduce((result, status) => {
    result[status.key] = orders.filter((order) => order.status === status.key).length
    return result
  }, {})
}

function createOrderFromCheckout(remark) {
  const checkout = getCheckoutSummary()

  if (!checkout.items.length) {
    return { ok: false, message: '请先选择要结算的商品' }
  }

  const order = {
    id: `ORD${Date.now()}`,
    status: 'pending_ship',
    time: formatTime(new Date()),
    pickup: mock.pickupInfo.name,
    remark: remark || '',
    items: checkout.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }))
  }
  const orders = getOrdersRaw()
  orders.unshift(order)
  saveOrdersRaw(orders)

  if (checkout.source === 'cart') {
    removeSelectedCartItems(checkout.items.map((item) => item.productId))
  }

  wx.removeStorageSync(CHECKOUT_KEY)
  return { ok: true, order: enrichOrder(order) }
}

function updateOrderStatus(orderId, status) {
  const orders = getOrdersRaw().map((order) => (
    order.id === orderId ? { ...order, status } : order
  ))
  saveOrdersRaw(orders)
}

function ensureFavorites() {
  if (!getStorage(FAVORITES_INIT_KEY, false)) {
    setStorage(FAVORITES_KEY, ['grape', 'greens'])
    setStorage(FAVORITES_INIT_KEY, true)
  }
}

function getFavoriteIds() {
  ensureFavorites()
  return getStorage(FAVORITES_KEY, [])
}

function getFavoriteProducts() {
  return enrichProducts(getFavoriteIds().map((id) => mock.getProduct(id)).filter(Boolean))
}

function isFavorite(productId) {
  return getFavoriteIds().includes(productId)
}

function toggleFavorite(productId) {
  const ids = getFavoriteIds()
  const exists = ids.includes(productId)
  const next = exists ? ids.filter((id) => id !== productId) : ids.concat(productId)
  setStorage(FAVORITES_KEY, next)

  return !exists
}

function getUser() {
  return getStorage(USER_KEY, mock.defaultUser)
}

function login() {
  setStorage(USER_KEY, mock.defaultUser)
  return mock.defaultUser
}

function logout() {
  const guest = {
    loggedIn: false,
    nickName: '未登录用户',
    avatarText: '访'
  }
  setStorage(USER_KEY, guest)
  return guest
}

function addFeedback(content) {
  const list = getStorage(FEEDBACK_KEY, [])
  list.unshift({
    content,
    time: formatTime(new Date())
  })
  setStorage(FEEDBACK_KEY, list)
}

module.exports = {
  addFeedback,
  addToCart,
  createOrderFromCheckout,
  enrichProduct,
  enrichProducts,
  getCartSummary,
  getCheckoutSummary,
  getFavoriteProducts,
  getOrderCounts,
  getOrders,
  getUser,
  isFavorite,
  login,
  logout,
  mock,
  money,
  removeCartItem,
  setCheckoutItems,
  toggleAllCartItems,
  toggleCartItem,
  toggleFavorite,
  updateCartQuantity,
  updateOrderStatus
}
