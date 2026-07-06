const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const COLLECTIONS = {
  bindings: 'owner_bindings',
  orders: 'orders',
  pickups: 'pickup_points'
}

const STATUS_TEXT = {
  pending_group: '拼团中',
  pending_ship: '待备货',
  pending_receive: '待自提',
  pending_comment: '已提货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

function nowText() {
  const date = new Date()
  const pad = (value) => (value < 10 ? `0${value}` : `${value}`)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function success(data = {}) {
  return {
    ok: true,
    ...data
  }
}

function failure(message, data = {}) {
  return {
    ok: false,
    message,
    ...data
  }
}

function normalizeId(doc = {}) {
  return {
    ...doc,
    id: doc.id || doc._id
  }
}

function normalizePickup(doc = {}) {
  const pickup = normalizeId(doc)

  return {
    ...pickup,
    serviceTime: pickup.serviceTime || pickup.time || '',
    time: pickup.time || pickup.serviceTime || '',
    phone: pickup.phone || '',
    notice: pickup.notice || ''
  }
}

function getItemQuantity(item = {}) {
  return Number(item.quantity || item.count || 1)
}

function getItemPrice(item = {}) {
  return Number(item.price || item.checkoutPrice || item.groupPrice || 0)
}

function getItemSnapshot(item = {}) {
  return item.productSnapshot || item.product || {}
}

function getItemName(item = {}) {
  const snapshot = getItemSnapshot(item)

  return snapshot.name || item.name || item.productName || item.productId || '未命名商品'
}

function getItemImage(item = {}) {
  const snapshot = getItemSnapshot(item)

  return snapshot.image || item.image || ''
}

function getItemSpec(item = {}) {
  const snapshot = getItemSnapshot(item)

  return snapshot.spec || item.spec || ''
}

function normalizeOrder(doc = {}) {
  const order = normalizeId(doc)
  const items = Array.isArray(order.items) ? order.items : []
  const totalAmount = Number(order.totalAmount || items.reduce((sum, item) => (
    sum + getItemPrice(item) * getItemQuantity(item)
  ), 0))

  return {
    ...order,
    status: order.status || 'pending_ship',
    statusText: STATUS_TEXT[order.status] || order.status || '待处理',
    contact: order.contact || {},
    items,
    itemCount: items.reduce((sum, item) => sum + getItemQuantity(item), 0),
    totalAmount,
    totalText: totalAmount.toFixed(2),
    createdAt: order.createdAt || order.time || '',
    time: order.time || order.createdAt || ''
  }
}

async function safeGetFirst(collectionName, where) {
  try {
    const result = await db.collection(collectionName).where(where).limit(1).get()
    return result.data && result.data[0] ? result.data[0] : null
  } catch (error) {
    return null
  }
}

async function safeGetDoc(collectionName, id) {
  if (!id) {
    return null
  }

  try {
    const result = await db.collection(collectionName).doc(id).get()
    return result.data || null
  } catch (error) {
    return null
  }
}

async function getOwnedPickup(openid) {
  const binding = await safeGetFirst(COLLECTIONS.bindings, {
    ownerOpenid: openid,
    status: 'active'
  }) || await safeGetFirst(COLLECTIONS.bindings, {
    openid,
    status: 'active'
  })

  let pickup = null
  const pickupId = binding && (binding.pickupId || binding.pickup_id)

  if (pickupId) {
    pickup = await safeGetDoc(COLLECTIONS.pickups, pickupId)
  }

  if (!pickup) {
    pickup = await safeGetFirst(COLLECTIONS.pickups, {
      ownerOpenid: openid,
      status: _.neq('closed')
    })
  }

  if (!pickup) {
    pickup = await safeGetFirst(COLLECTIONS.pickups, {
      ownerOpenids: _.in([openid]),
      status: _.neq('closed')
    })
  }

  if (!pickup) {
    return {
      canManage: false,
      pickup: null
    }
  }

  return {
    canManage: true,
    pickup: normalizePickup(pickup)
  }
}

async function getOrdersByPickup(pickupId) {
  try {
    const result = await db
      .collection(COLLECTIONS.orders)
      .where({ pickupId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    return (result.data || []).map(normalizeOrder)
  } catch (error) {
    return []
  }
}

async function getOrderForPickup(orderId, pickupId) {
  let order = await safeGetDoc(COLLECTIONS.orders, orderId)

  if (!order) {
    order = await safeGetFirst(COLLECTIONS.orders, { id: orderId })
  }

  const normalized = order ? normalizeOrder(order) : null

  if (!normalized || normalized.pickupId !== pickupId) {
    return null
  }

  return normalized
}

function filterOrders(orders, options = {}) {
  const status = options.status && options.status !== 'all' ? options.status : ''
  const keyword = String(options.keyword || '').trim().toLowerCase()

  return orders.filter((order) => {
    if (status && order.status !== status) {
      return false
    }

    if (!keyword) {
      return true
    }

    const contact = order.contact || {}
    const text = [
      order.id,
      order._id,
      contact.name,
      contact.phone,
      order.remark,
      ...order.items.map(getItemName)
    ].join(' ').toLowerCase()

    return text.includes(keyword)
  })
}

function buildStats(orders) {
  const itemCount = orders.reduce((sum, order) => sum + Number(order.itemCount || 0), 0)

  return {
    totalOrders: orders.length,
    preparingOrders: orders.filter((order) => order.status === 'pending_ship').length,
    readyOrders: orders.filter((order) => order.status === 'pending_receive').length,
    pickedOrders: orders.filter((order) => ['pending_comment', 'completed'].includes(order.status)).length,
    itemCount
  }
}

function buildProductSummary(orders) {
  const map = {}

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const productId = item.productId || getItemName(item)
      const current = map[productId] || {
        productId,
        name: getItemName(item),
        image: getItemImage(item),
        spec: getItemSpec(item),
        totalQuantity: 0,
        orderCount: 0,
        statuses: {}
      }

      current.totalQuantity += getItemQuantity(item)
      current.orderCount += 1
      current.statuses[order.status] = (current.statuses[order.status] || 0) + 1
      map[productId] = current
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

function buildRecipient(order) {
  const contact = order.contact || {}

  return {
    id: order.id,
    orderId: order.id,
    status: order.status,
    statusText: order.statusText,
    name: contact.name || '未填写姓名',
    phone: contact.phone || '',
    address: contact.address || contact.detail || '',
    remark: order.remark || '',
    time: order.time,
    totalText: order.totalText,
    canPickup: order.status === 'pending_receive',
    items: order.items.map((item) => ({
      productId: item.productId || '',
      name: getItemName(item),
      spec: getItemSpec(item),
      image: getItemImage(item),
      quantity: getItemQuantity(item),
      price: getItemPrice(item),
      priceText: getItemPrice(item).toFixed(2)
    }))
  }
}

function pickAllowedFields(input = {}, fields = []) {
  return fields.reduce((result, field) => {
    if (input[field] !== undefined) {
      result[field] = input[field]
    }

    return result
  }, {})
}

async function updatePickup(pickup, data = {}) {
  const updateData = pickAllowedFields(data, ['address', 'serviceTime', 'time', 'phone', 'notice'])

  if (updateData.time && !updateData.serviceTime) {
    updateData.serviceTime = updateData.time
  }

  if (!Object.keys(updateData).length) {
    return normalizePickup(pickup)
  }

  updateData.updatedAt = nowText()
  await db.collection(COLLECTIONS.pickups).doc(pickup._id || pickup.id).update({
    data: updateData
  })

  return normalizePickup({
    ...pickup,
    ...updateData
  })
}

async function markPickedUp(orderId, pickupId) {
  const order = await getOrderForPickup(orderId, pickupId)

  if (!order) {
    return failure('订单不存在或无权操作')
  }

  await db.collection(COLLECTIONS.orders).doc(order._id || order.id).update({
    data: {
      status: 'pending_comment',
      pickedUpAt: nowText(),
      updatedAt: nowText()
    }
  })

  return success({
    order: {
      ...order,
      status: 'pending_comment',
      statusText: STATUS_TEXT.pending_comment,
      canPickup: false
    }
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action || 'getDashboard'
  const payload = event.payload || {}

  if (!OPENID) {
    return failure('无法识别当前微信用户')
  }

  const owner = await getOwnedPickup(OPENID)

  if (!owner.canManage) {
    return failure('当前账号未绑定自提点', {
      canManage: false
    })
  }

  const pickup = owner.pickup

  if (action === 'getPickup') {
    return success({
      canManage: true,
      pickup
    })
  }

  if (action === 'updatePickup') {
    const updatedPickup = await updatePickup(pickup, payload.pickup || payload)

    return success({
      canManage: true,
      pickup: updatedPickup
    })
  }

  if (action === 'markPickedUp') {
    return markPickedUp(payload.orderId, pickup.id)
  }

  const orders = await getOrdersByPickup(pickup.id)

  if (action === 'getProducts') {
    const filteredOrders = filterOrders(orders, {
      status: payload.status || 'all'
    })

    return success({
      canManage: true,
      pickup,
      stats: buildStats(filteredOrders),
      products: buildProductSummary(filteredOrders)
    })
  }

  if (action === 'getRecipients') {
    const filteredOrders = filterOrders(orders, payload)

    return success({
      canManage: true,
      pickup,
      orders: filteredOrders.map(buildRecipient)
    })
  }

  return success({
    canManage: true,
    pickup,
    stats: buildStats(orders),
    products: buildProductSummary(orders).slice(0, payload.lite ? 3 : 8),
    recentOrders: orders.slice(0, payload.lite ? 3 : 8).map(buildRecipient)
  })
}
