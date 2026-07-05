const mock = require('./mock-data')

const CART_KEY = 'fresh_cart'
const CART_INIT_KEY = 'fresh_cart_initialized'
const CHECKOUT_KEY = 'fresh_checkout'
const FAVORITES_KEY = 'fresh_favorites'
const FAVORITES_INIT_KEY = 'fresh_favorites_initialized'
const GROUPS_KEY = 'fresh_groups'
const GROUPS_INIT_KEY = 'fresh_groups_initialized'
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

function isGroupEnabled(product) {
  return isProductAvailable(product) && !!product.group && Number(product.groupPrice) > 0
}

function getPickupPoint(pickupId) {
  return mock.pickupPoints.find((item) => item.id === pickupId) || mock.pickupInfo
}

function getCurrentUser() {
  return getUser()
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
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
  const groupEnabled = isGroupEnabled(product)

  return {
    ...product,
    available,
    categoryName: category ? category.name : '',
    groupEnabled,
    groupPriceText: product.groupPrice ? money(product.groupPrice) : '',
    groupSizeText: `${product.groupSize || 5} 人团`,
    priceText: money(product.price),
    originalPriceText: money(product.originalPrice),
    stockText: available ? `剩余 ${product.stock} 份` : '暂时售罄',
    statusText: available ? '可购买' : '暂时售罄'
  }
}

function enrichProducts(products) {
  return products.map(enrichProduct).filter(Boolean)
}

function ensureGroups() {
  if (!getStorage(GROUPS_INIT_KEY, false)) {
    setStorage(GROUPS_KEY, [
      {
        id: 'GRP20260705001',
        productId: 'orange',
        leaderId: 'user_hua',
        pickupId: 'happy',
        groupPrice: 18.8,
        groupSize: 5,
        status: 'active',
        createdAt: '2026-07-05 10:20',
        expiresAt: '2026-07-06 10:20',
        members: [
          { userId: 'user_hua', nickName: '华神', avatarText: '华', paid: true, joinedAt: '2026-07-05 10:20' },
          { userId: 'user_keke', nickName: 'keke可口', avatarText: '橘', paid: true, joinedAt: '2026-07-05 10:34' }
        ]
      },
      {
        id: 'GRP20260705002',
        productId: 'grape',
        leaderId: 'user_self',
        pickupId: 'happy',
        groupPrice: 19.9,
        groupSize: 5,
        status: 'active',
        createdAt: '2026-07-05 11:08',
        expiresAt: '2026-07-06 11:08',
        members: [
          { userId: 'user_self', nickName: '小刘', avatarText: '刘', paid: true, joinedAt: '2026-07-05 11:08' }
        ]
      }
    ])
    setStorage(GROUPS_INIT_KEY, true)
  }
}

function getGroupsRaw() {
  ensureGroups()
  return getStorage(GROUPS_KEY, [])
}

function saveGroupsRaw(groups) {
  setStorage(GROUPS_KEY, groups)
}

function getPaidMembers(group) {
  return (group.members || []).filter((member) => member.paid !== false)
}

function getGroupStatus(group) {
  const paidCount = getPaidMembers(group).length

  if (group.status === 'completed' || paidCount >= (group.groupSize || 5)) {
    return 'completed'
  }

  if (group.status === 'failed') {
    return 'failed'
  }

  return 'active'
}

function buildProgressSlots(group) {
  const members = getPaidMembers(group)
  const size = group.groupSize || 5
  const slots = []

  for (let index = 0; index < size; index += 1) {
    const member = members[index]
    slots.push({
      filled: !!member,
      text: member ? (member.avatarText || member.nickName.slice(0, 1)) : `+${index - members.length + 1}`,
      name: member ? member.nickName : '待邀请'
    })
  }

  return slots
}

function enrichGroup(group) {
  if (!group) {
    return null
  }

  const product = enrichProduct(mock.getProduct(group.productId))
  const pickup = getPickupPoint(group.pickupId)
  const user = getCurrentUser()
  const paidMembers = getPaidMembers(group)
  const groupSize = group.groupSize || (product && product.groupSize) || 5
  const memberCount = paidMembers.length
  const remaining = Math.max(0, groupSize - memberCount)
  const status = getGroupStatus(group)
  const leader = paidMembers[0] || {}
  const leaderName = leader.nickName || '团长'
  const isMine = group.leaderId === user.id
  const isMember = paidMembers.some((member) => member.userId === user.id)

  return {
    ...group,
    product,
    pickup,
    status,
    statusText: status === 'completed' ? '已成团' : status === 'failed' ? '未成团' : '拼团中',
    isMine,
    isMember,
    leader,
    leaderName,
    leaderAvatarText: leader.avatarText || leaderName.slice(0, 1),
    leaderLabel: `${leaderName}${isMine ? '（我的团）' : ''}`,
    memberCount,
    remaining,
    remainingText: remaining > 0 ? `还差 ${remaining} 人拼成` : `已满 ${groupSize} 人成团`,
    groupPriceText: money(group.groupPrice || (product && product.groupPrice)),
    progressSlots: buildProgressSlots({ ...group, groupSize }),
    actionText: isMine ? '邀请' : `¥${money(group.groupPrice || (product && product.groupPrice))} 去参团`,
    canJoin: status === 'active' && remaining > 0 && !isMember
  }
}

function getVisibleGroups(productId) {
  return getGroupsRaw()
    .filter((group) => group.productId === productId)
    .map(enrichGroup)
    .filter((group) => group && group.status === 'active' && group.remaining > 0)
}

function getGroupById(groupId) {
  return enrichGroup(getGroupsRaw().find((group) => group.id === groupId))
}

function completeGroupIfReady(group, orders) {
  const paidCount = getPaidMembers(group).length
  const groupSize = group.groupSize || 5

  if (paidCount < groupSize) {
    return false
  }

  group.status = 'completed'
  group.completedAt = formatTime(new Date())
  orders.forEach((order) => {
    if (order.groupId === group.id && order.status === 'pending_group') {
      order.status = 'pending_ship'
    }
  })

  return true
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

function setCheckoutItems(items, source, extra = {}) {
  const normalized = items.map((item) => ({
    productId: item.productId || item.id,
    quantity: item.cartQuantity || item.quantity || 1
  })).filter((item) => item.productId)

  setStorage(CHECKOUT_KEY, {
    source: source || 'cart',
    items: normalized,
    ...extra
  })
}

function setGroupCheckout(options) {
  const product = mock.getProduct(options.productId)

  if (!isGroupEnabled(product)) {
    return { ok: false, message: '该商品暂不支持团购' }
  }

  setCheckoutItems([
    {
      productId: options.productId,
      quantity: options.quantity || 1
    }
  ], options.mode, {
    groupId: options.groupId || '',
    pickupId: options.pickupId || mock.pickupInfo.id
  })

  return { ok: true }
}

function getCheckoutSummary() {
  const checkout = getStorage(CHECKOUT_KEY, { source: 'cart', items: [] })
  const isGroup = checkout.source === 'group_open' || checkout.source === 'group_join'
  const targetGroup = checkout.groupId ? getGroupById(checkout.groupId) : null
  const pickup = targetGroup ? targetGroup.pickup : getPickupPoint(checkout.pickupId)
  const items = (checkout.items || []).map((item) => {
    const product = mock.getProduct(item.productId)

    if (!isProductAvailable(product)) {
      return null
    }

    const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, getLimit(product)))
    const checkoutPrice = isGroup ? Number(product.groupPrice || product.price) : Number(product.price)
    const subtotal = checkoutPrice * quantity

    return {
      ...enrichProduct(product),
      checkoutPrice,
      checkoutPriceText: money(checkoutPrice),
      productId: product.id,
      quantity,
      subtotal,
      subtotalText: money(subtotal)
    }
  }).filter(Boolean)
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)
  const originalTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0)
  const discount = Math.max(0, originalTotal - total)

  return {
    source: checkout.source || 'cart',
    groupId: checkout.groupId || '',
    pickupId: pickup.id,
    pickup,
    isGroup,
    isGroupOpen: checkout.source === 'group_open',
    isGroupJoin: checkout.source === 'group_join',
    targetGroup,
    submitText: checkout.source === 'group_open'
      ? '支付并开团'
      : checkout.source === 'group_join'
        ? '支付并参团'
        : '提交订单',
    items,
    originalTotal,
    originalTotalText: money(originalTotal),
    discount,
    discountText: money(discount),
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
  const group = order.groupId ? getGroupById(order.groupId) : null
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
    group,
    isGroup: !!order.isGroup,
    groupProgressText: group ? `${group.memberCount}/${group.groupSize || 5} 人` : '',
    groupRemainingText: group ? group.remainingText : '',
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    statusText: status.name,
    actionText: order.status === 'pending_group'
      ? (group && group.isMine ? '邀请好友' : '查看拼团')
      : status.action,
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

  const rawCheckout = getStorage(CHECKOUT_KEY, { source: 'cart', items: [] })
  const user = getCurrentUser()

  if (checkout.isGroup) {
    const product = mock.getProduct(checkout.items[0].productId)

    if (!isGroupEnabled(product)) {
      return { ok: false, message: '该商品暂不支持团购' }
    }

    const orders = getOrdersRaw()
    const groups = getGroupsRaw()
    const pickup = checkout.pickup || mock.pickupInfo
    const order = {
      id: `ORD${Date.now()}`,
      status: 'pending_group',
      time: formatTime(new Date()),
      pickup: pickup.name,
      pickupId: pickup.id,
      remark: remark || '',
      isGroup: true,
      groupId: '',
      groupRole: rawCheckout.source === 'group_open' ? 'leader' : 'member',
      items: checkout.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.checkoutPrice,
        originalPrice: item.price,
        groupPrice: item.groupPrice
      }))
    }

    let group
    let completed = false

    if (rawCheckout.source === 'group_join') {
      const groupIndex = groups.findIndex((item) => item.id === rawCheckout.groupId)

      if (groupIndex < 0) {
        return { ok: false, message: '该拼团不存在' }
      }

      group = groups[groupIndex]
      const enriched = enrichGroup(group)

      if (!enriched || enriched.status !== 'active' || enriched.remaining <= 0) {
        return { ok: false, message: '该拼团已满员，请选择其他拼团' }
      }

      if ((group.members || []).some((member) => member.userId === user.id)) {
        return { ok: false, message: '你已参与该拼团' }
      }

      order.groupId = group.id
      order.pickupId = group.pickupId
      order.pickup = getPickupPoint(group.pickupId).name
      group.members = (group.members || []).concat({
        userId: user.id,
        nickName: user.nickName,
        avatarText: user.avatarText,
        paid: true,
        orderId: order.id,
        joinedAt: order.time
      })
      orders.unshift(order)
      completed = completeGroupIfReady(group, orders)
    } else {
      group = {
        id: `GRP${Date.now()}`,
        productId: product.id,
        leaderId: user.id,
        pickupId: pickup.id,
        groupPrice: product.groupPrice,
        groupSize: product.groupSize || 5,
        status: 'active',
        createdAt: order.time,
        expiresAt: formatTime(addHours(new Date(), 24)),
        members: [
          {
            userId: user.id,
            nickName: user.nickName,
            avatarText: user.avatarText,
            paid: true,
            orderId: order.id,
            joinedAt: order.time
          }
        ]
      }
      order.groupId = group.id
      groups.unshift(group)
      orders.unshift(order)
    }

    saveGroupsRaw(groups)
    saveOrdersRaw(orders)
    wx.removeStorageSync(CHECKOUT_KEY)

    return {
      ok: true,
      type: rawCheckout.source,
      groupId: group.id,
      completed,
      order: enrichOrder(orders.find((item) => item.id === order.id))
    }
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
  getGroupById,
  getOrderCounts,
  getOrders,
  getPickupPoint,
  getVisibleGroups,
  getUser,
  isFavorite,
  login,
  logout,
  mock,
  money,
  removeCartItem,
  setGroupCheckout,
  setCheckoutItems,
  toggleAllCartItems,
  toggleCartItem,
  toggleFavorite,
  updateCartQuantity,
  updateOrderStatus
}
