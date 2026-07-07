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
const USER_ID_KEY = 'fresh_user_id'
const USER_OPENID_KEY = 'fresh_user_openid'
const ADDRESS_KEY = 'fresh_user_addresses'
const FEEDBACK_KEY = 'fresh_feedback'
const CLOUD_GROUPS_COLLECTION = 'fresh_groups'
const CLOUD_GROUP_MEMBERS_COLLECTION = 'fresh_group_members'
const CLOUD_BANNERS_COLLECTION = 'banners'
const CLOUD_CATEGORIES_COLLECTION = 'categories'
const CLOUD_ORDERS_COLLECTION = 'orders'
const CLOUD_PICKUP_POINTS_COLLECTION = 'pickup_points'
const CLOUD_PRODUCTS_COLLECTION = 'products'
const LEGACY_DEMO_CART_ITEMS = [
  { productId: 'grape', quantity: 2, selected: true },
  { productId: 'orange', quantity: 1, selected: true },
  { productId: 'eggs', quantity: 1, selected: false }
]
const LEGACY_DEMO_GROUP_IDS = ['GRP20260705001', 'GRP20260705002']
const LEGACY_DEMO_ORDER_IDS = ['ORD20260705001', 'ORD20260704002', 'ORD20260703006']

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

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function getCloudUserId(openid) {
  return openid ? `openid:${openid}` : ''
}

function getClientUserId() {
  const openid = getStorage(USER_OPENID_KEY, '')

  if (openid) {
    return getCloudUserId(openid)
  }

  const existing = getStorage(USER_ID_KEY, '')

  if (existing) {
    return existing
  }

  const id = randomId('wx_user')
  setStorage(USER_ID_KEY, id)
  return id
}

function getAvatarText(nickName) {
  const text = String(nickName || '').trim()
  return text ? text.slice(0, 1) : '微'
}

async function fetchCloudIdentity() {
  if (!canUseCloud() || !wx.cloud.callFunction) {
    return null
  }

  try {
    const result = await wx.cloud.callFunction({
      name: 'getOpenId'
    })
    const identity = result && result.result ? result.result : {}

    if (!identity.openid) {
      return null
    }

    setStorage(USER_OPENID_KEY, identity.openid)
    setStorage(USER_ID_KEY, getCloudUserId(identity.openid))

    return {
      openid: identity.openid,
      appid: identity.appid || '',
      unionid: identity.unionid || '',
      userId: getCloudUserId(identity.openid)
    }
  } catch (error) {
    console.warn('fetchCloudIdentity failed', error)
    return null
  }
}

async function prepareCloudIdentity() {
  const current = getUser()
  const identity = await fetchCloudIdentity()

  if (!identity) {
    return {
      ok: false,
      userId: current.id,
      message: '云端身份未就绪，请确认 getOpenId 云函数已部署'
    }
  }

  if (current.id && current.id !== identity.userId) {
    migrateAddressReference(current.id, identity.userId)
    migrateUserReferences(current.id, {
      ...current,
      id: identity.userId,
      openid: identity.openid
    })
  }

  return {
    ok: true,
    ...identity
  }
}

function normalizeUser(user) {
  const openid = getStorage(USER_OPENID_KEY, '')
  const fallback = {
    ...mock.defaultUser,
    id: getClientUserId(),
    openid
  }
  const next = {
    ...fallback,
    ...(user || {})
  }

  return {
    ...next,
    openid: next.openid || openid,
    avatarText: next.avatarText || getAvatarText(next.nickName),
    profileSynced: !!next.profileSynced
  }
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

function getPickupPointSnapshot(pickupId) {
  const pickup = getPickupPoint(pickupId)

  return {
    id: pickup.id,
    name: pickup.name,
    address: pickup.address,
    time: pickup.time || pickup.serviceTime || '',
    phone: pickup.phone || '',
    notice: pickup.notice || ''
  }
}

function getCurrentUser() {
  return getUser()
}

function normalizeAddress(address = {}) {
  const name = String(address.name || '').trim()
  const phone = String(address.phone || '').trim()
  const detail = String(address.detail || address.address || '').trim()

  return {
    name,
    phone,
    detail,
    address: detail,
    isComplete: !!(name && phone && detail)
  }
}

function getAddressBook() {
  return getStorage(ADDRESS_KEY, {})
}

function migrateAddressReference(fromId, toId) {
  if (!fromId || !toId || fromId === toId) {
    return
  }

  const book = getAddressBook()

  if (!book[fromId]) {
    return
  }

  setStorage(ADDRESS_KEY, {
    ...book,
    [toId]: book[toId] || book[fromId]
  })
}

function getUserAddress() {
  const user = getCurrentUser()
  const book = getAddressBook()

  return normalizeAddress(book[user.id] || {})
}

function saveUserAddress(address) {
  const user = getCurrentUser()
  const normalized = normalizeAddress(address)
  const book = {
    ...getAddressBook(),
    [user.id]: normalized
  }

  setStorage(ADDRESS_KEY, book)
  return normalized
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function isLegacyDemoCart(items) {
  if (!Array.isArray(items) || items.length !== LEGACY_DEMO_CART_ITEMS.length) {
    return false
  }

  return LEGACY_DEMO_CART_ITEMS.every((demoItem) => {
    const item = items.find((cartItem) => cartItem && cartItem.productId === demoItem.productId)

    return item
      && Number(item.quantity) === demoItem.quantity
      && item.selected === demoItem.selected
  })
}

function isStoredUserLoggedIn() {
  const user = getStorage(USER_KEY, null)

  return !!(user && user.loggedIn)
}

function ensureCart() {
  let currentCart = getStorage(CART_KEY, [])

  if (!Array.isArray(currentCart)) {
    currentCart = []
    setStorage(CART_KEY, currentCart)
  }

  if (!getStorage(CART_INIT_KEY, false)) {
    setStorage(CART_KEY, currentCart)
    setStorage(CART_INIT_KEY, true)
  }

  if (!isStoredUserLoggedIn() && isLegacyDemoCart(currentCart)) {
    setStorage(CART_KEY, [])
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
    setStorage(GROUPS_KEY, [])
    setStorage(GROUPS_INIT_KEY, true)
  }
}

function filterLegacyDemoGroups(groups) {
  return (groups || []).filter((group) => (
    group
    && !LEGACY_DEMO_GROUP_IDS.includes(group.id)
    && group.leaderId !== 'user_self'
    && !(group.members || []).some((member) => member.userId === 'user_self')
  ))
}

function getGroupsRaw() {
  ensureGroups()
  const groups = getStorage(GROUPS_KEY, [])
  const filtered = filterLegacyDemoGroups(groups)

  if (filtered.length !== groups.length) {
    saveGroupsRaw(filtered)
  }

  return filtered
}

function saveGroupsRaw(groups) {
  setStorage(GROUPS_KEY, groups)
}

function getGroupRawById(groupId) {
  return getGroupsRaw().find((group) => group.id === groupId)
}

function getPaidMembers(group) {
  return (group.members || []).filter((member) => member.paid !== false)
}

function normalizeMember(member) {
  if (!member || !member.userId) {
    return null
  }

  return {
    userId: member.userId,
    nickName: member.nickName || '微信用户',
    avatarText: member.avatarText || getAvatarText(member.nickName),
    avatarUrl: member.avatarUrl || '',
    paid: member.paid !== false,
    orderId: member.orderId || '',
    joinedAt: member.joinedAt || ''
  }
}

function mergeMembers(...memberLists) {
  const memberMap = {}

  memberLists.flat().forEach((member) => {
    const normalized = normalizeMember(member)

    if (!normalized) {
      return
    }

    const current = memberMap[normalized.userId] || {}
    memberMap[normalized.userId] = {
      ...current,
      ...normalized,
      avatarUrl: normalized.avatarUrl || current.avatarUrl || '',
      orderId: normalized.orderId || current.orderId || ''
    }
  })

  return Object.values(memberMap)
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
      avatarUrl: member ? member.avatarUrl || '' : '',
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
    groupSize,
    leaderAvatarText: leader.avatarText || leaderName.slice(0, 1),
    leaderAvatarUrl: leader.avatarUrl || '',
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

function canUseCloud() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.database
}

function getCloudDb() {
  return canUseCloud() ? wx.cloud.database() : null
}

function sanitizeGroupForCloud(group) {
  const members = mergeMembers(group.members || [])

  return {
    id: group.id,
    productId: group.productId,
    leaderId: group.leaderId,
    pickupId: group.pickupId,
    groupPrice: group.groupPrice,
    groupSize: group.groupSize || 5,
    status: group.status || 'active',
    createdAt: group.createdAt,
    expiresAt: group.expiresAt || '',
    completedAt: group.completedAt || '',
    members,
    updatedAt: formatTime(new Date())
  }
}

function sanitizeMemberForCloud(group, member) {
  const normalized = normalizeMember(member)

  if (!normalized) {
    return null
  }

  return {
    id: `${group.id}_${normalized.userId}`,
    groupId: group.id,
    ...normalized,
    updatedAt: formatTime(new Date())
  }
}

function normalizeRemoteMember(member) {
  const openid = member && member._openid
  const userId = openid ? getCloudUserId(openid) : member.userId

  return {
    ...member,
    userId
  }
}

function normalizeRemoteGroup(group, memberDocs) {
  const openid = group && group._openid
  const leaderId = openid ? getCloudUserId(openid) : group.leaderId
  const members = mergeMembers(
    (group.members || []).map((member) => (
      member.userId === group.leaderId && openid
        ? { ...member, userId: leaderId }
        : member
    )),
    (memberDocs || []).map(normalizeRemoteMember)
  )

  return {
    ...group,
    id: group.id || group._id,
    leaderId,
    members
  }
}

function mergeGroups(localGroups, remoteGroups) {
  const groupMap = {}

  ;[...filterLegacyDemoGroups(localGroups), ...filterLegacyDemoGroups(remoteGroups)].forEach((group) => {
    if (!group || !group.id) {
      return
    }

    const current = groupMap[group.id]

    if (!current) {
      groupMap[group.id] = {
        ...group,
        members: mergeMembers(group.members || [])
      }
      return
    }

    const members = mergeMembers(current.members || [], group.members || [])
    const groupSize = group.groupSize || current.groupSize || 5
    groupMap[group.id] = {
      ...current,
      ...group,
      groupSize,
      status: current.status === 'completed' || group.status === 'completed' || getPaidMembers({ members }).length >= groupSize
        ? 'completed'
        : (group.status || current.status || 'active'),
      members
    }
  })

  return Object.values(groupMap).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
}

function reconcileOrdersWithGroups(groups) {
  const orders = getOrdersRaw()
  let changed = false

  orders.forEach((order) => {
    if (order.status !== 'pending_group' || !order.groupId) {
      return
    }

    const group = groups.find((item) => item.id === order.groupId)

    if (group && getGroupStatus(group) === 'completed') {
      order.status = 'pending_ship'
      changed = true
    }
  })

  if (changed) {
    saveOrdersRaw(orders)
  }
}

async function getCloudCollectionData(collectionName) {
  const db = getCloudDb()

  if (!db) {
    return []
  }

  const result = await db.collection(collectionName).limit(100).get()
  return result.data || []
}

async function safeGetCloudCollectionData(collectionName) {
  try {
    return await getCloudCollectionData(collectionName)
  } catch (error) {
    return []
  }
}

function normalizeCloudBaseDoc(doc = {}) {
  return {
    ...doc,
    id: doc.id || doc._id
  }
}

function normalizeCloudBanner(doc) {
  return normalizeCloudBaseDoc(doc)
}

function normalizeCloudCategory(doc) {
  return normalizeCloudBaseDoc(doc)
}

function normalizeCloudPickup(doc = {}) {
  const item = normalizeCloudBaseDoc(doc)

  return {
    ...item,
    time: item.time || item.serviceTime || '',
    distance: item.distance || item.distanceText || ''
  }
}

function normalizeCloudProduct(doc = {}) {
  const item = normalizeCloudBaseDoc(doc)
  const groupEnabled = item.group !== undefined ? item.group : !!item.groupEnabled

  return {
    ...item,
    group: groupEnabled,
    featured: !!item.featured,
    status: item.status || (Number(item.stock || 0) > 0 ? 'available' : 'soldout')
  }
}

function sortBySortField(items) {
  return items.slice().sort((left, right) => {
    const leftSort = Number(left.sort || 0)
    const rightSort = Number(right.sort || 0)

    if (leftSort !== rightSort) {
      return leftSort - rightSort
    }

    return String(left.id || '').localeCompare(String(right.id || ''))
  })
}

async function syncCatalogFromCloud() {
  if (!canUseCloud() || !mock.setCatalog) {
    return false
  }

  const [categoryDocs, productDocs, bannerDocs, pickupDocs] = await Promise.all([
    safeGetCloudCollectionData(CLOUD_CATEGORIES_COLLECTION),
    safeGetCloudCollectionData(CLOUD_PRODUCTS_COLLECTION),
    safeGetCloudCollectionData(CLOUD_BANNERS_COLLECTION),
    safeGetCloudCollectionData(CLOUD_PICKUP_POINTS_COLLECTION)
  ])

  const catalog = {}

  if (categoryDocs.length) {
    catalog.categories = sortBySortField(
      categoryDocs
        .map(normalizeCloudCategory)
        .filter((item) => item.enabled !== false && item.status !== 'hidden')
    )
  }

  if (productDocs.length) {
    catalog.products = sortBySortField(
      productDocs
        .map(normalizeCloudProduct)
        .filter((item) => item.status !== 'hidden')
    )
  }

  if (bannerDocs.length) {
    catalog.banners = sortBySortField(
      bannerDocs
        .map(normalizeCloudBanner)
        .filter((item) => item.enabled !== false)
    )
  }

  if (pickupDocs.length) {
    catalog.pickupPoints = sortBySortField(
      pickupDocs
        .map(normalizeCloudPickup)
        .filter((item) => item.status !== 'closed' && item.enabled !== false)
    )
  }

  const changed = Object.keys(catalog).length > 0

  if (changed) {
    mock.setCatalog(catalog)
  }

  return changed
}

async function syncGroupsFromCloud() {
  if (!canUseCloud()) {
    return false
  }

  try {
    const [remoteGroupDocs, remoteMemberDocs] = await Promise.all([
      safeGetCloudCollectionData(CLOUD_GROUPS_COLLECTION),
      safeGetCloudCollectionData(CLOUD_GROUP_MEMBERS_COLLECTION)
    ])

    if (!remoteGroupDocs.length && !remoteMemberDocs.length) {
      return false
    }

    const membersByGroup = remoteMemberDocs.reduce((result, member) => {
      if (!member.groupId) {
        return result
      }

      result[member.groupId] = result[member.groupId] || []
      result[member.groupId].push(member)
      return result
    }, {})
    const remoteGroups = remoteGroupDocs.map((group) => normalizeRemoteGroup(
      group,
      membersByGroup[group.id || group._id] || []
    ))
    const merged = mergeGroups(getGroupsRaw(), remoteGroups)

    saveGroupsRaw(merged)
    reconcileOrdersWithGroups(merged)
    return true
  } catch (error) {
    console.warn('syncGroupsFromCloud failed', error)
    return false
  }
}

async function saveCloudDoc(collectionName, docId, data) {
  const db = getCloudDb()

  if (!db || !docId) {
    return { ok: false, message: '云开发未初始化' }
  }

  try {
    await db.collection(collectionName).doc(docId).set({
      data
    })
    return { ok: true }
  } catch (error) {
    console.warn(`saveCloudDoc ${collectionName} failed`, error)
    return {
      ok: false,
      message: error && (error.errMsg || error.message) ? (error.errMsg || error.message) : '云端写入失败'
    }
  }
}

async function publishGroupChange(groupId) {
  if (!canUseCloud()) {
    return { ok: false, message: '云开发未初始化' }
  }

  const group = getGroupRawById(groupId)
  const user = getCurrentUser()

  if (!group) {
    return { ok: false, message: '拼团不存在' }
  }

  const member = (group.members || []).find((item) => item.userId === user.id)
  const tasks = []

  if (group.leaderId === user.id) {
    tasks.push(saveCloudDoc(CLOUD_GROUPS_COLLECTION, group.id, sanitizeGroupForCloud(group)))
  }

  const memberDoc = sanitizeMemberForCloud(group, member)

  if (memberDoc) {
    tasks.push(saveCloudDoc(CLOUD_GROUP_MEMBERS_COLLECTION, memberDoc.id, memberDoc))
  }

  if (!tasks.length) {
    return { ok: false, message: '没有需要同步的拼团数据' }
  }

  const results = await Promise.all(tasks)
  const failed = results.find((item) => !item.ok)

  return {
    ok: results.some((item) => item.ok),
    message: failed ? failed.message : ''
  }
}

async function syncSharedData() {
  const [catalogSynced, groupsSynced] = await Promise.all([
    syncCatalogFromCloud(),
    syncGroupsFromCloud()
  ])

  return catalogSynced || groupsSynced
}

function sanitizeOrderItemForCloud(item) {
  const product = mock.getProduct(item.productId)
  const quantity = Number(item.quantity) || 1
  const price = Number(item.price || (product && product.price) || 0)

  return {
    productId: item.productId,
    quantity,
    price,
    originalPrice: Number(item.originalPrice || (product && product.price) || price),
    groupPrice: item.groupPrice === null || item.groupPrice === undefined ? null : Number(item.groupPrice),
    subtotal: price * quantity,
    productSnapshot: product ? {
      id: product.id,
      name: product.name,
      image: product.image,
      spec: product.spec,
      categoryId: product.categoryId,
      tag: product.tag || ''
    } : {}
  }
}

function sanitizeOrderForCloud(order) {
  const user = getCurrentUser()
  const items = (order.items || []).map(sanitizeOrderItemForCloud)
  const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  const pickupId = order.pickupId || mock.pickupInfo.id

  return {
    id: order.id,
    userId: user.id,
    userOpenid: user.openid || getStorage(USER_OPENID_KEY, ''),
    status: order.status || 'pending_ship',
    time: order.time || formatTime(new Date()),
    createdAt: order.createdAt || order.time || formatTime(new Date()),
    updatedAt: formatTime(new Date()),
    pickup: order.pickup || getPickupPoint(pickupId).name,
    pickupId,
    pickupSnapshot: getPickupPointSnapshot(pickupId),
    contact: order.contact || {},
    remark: order.remark || '',
    items,
    totalAmount,
    isGroup: !!order.isGroup,
    groupId: order.groupId || '',
    groupRole: order.groupRole || '',
    paidAt: order.paidAt || order.time || formatTime(new Date())
  }
}

async function publishOrderToCloud(order) {
  if (!order || !order.id) {
    return { ok: false, message: '订单不存在' }
  }

  return saveCloudDoc(CLOUD_ORDERS_COLLECTION, order.id, sanitizeOrderForCloud(order))
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
    setStorage(ORDERS_KEY, [])
    setStorage(ORDERS_INIT_KEY, true)
  }
}

function filterLegacyDemoOrders(orders) {
  return (orders || []).filter((order) => order && !LEGACY_DEMO_ORDER_IDS.includes(order.id))
}

function getOrdersRaw() {
  ensureOrders()
  const orders = getStorage(ORDERS_KEY, [])
  const filtered = filterLegacyDemoOrders(orders)

  if (filtered.length !== orders.length) {
    saveOrdersRaw(filtered)
  }

  return filtered
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

function buildVirtualGroupOrders(existingOrders) {
  const orderGroupIds = existingOrders
    .filter((order) => order.groupId)
    .map((order) => order.groupId)

  return getGroupsRaw()
    .map(enrichGroup)
    .filter((group) => group && group.isMember && !orderGroupIds.includes(group.id))
    .map((group) => {
      const user = getCurrentUser()
      const member = (group.members || []).find((item) => item.userId === user.id) || {}
      const status = group.status === 'completed' ? 'pending_ship' : 'pending_group'

      return {
        id: `GRPORDER${group.id}`,
        status,
        time: member.joinedAt || group.createdAt,
        pickup: group.pickup.name,
        pickupId: group.pickup.id,
        remark: '',
        isGroup: true,
        virtual: true,
        groupId: group.id,
        groupRole: group.isMine ? 'leader' : 'member',
        items: [
          {
            productId: group.productId,
            quantity: 1,
            price: Number(group.groupPrice || (group.product && group.product.groupPrice) || 0),
            groupPrice: Number(group.groupPrice || (group.product && group.product.groupPrice) || 0)
          }
        ]
      }
    })
}

function getCombinedOrdersRaw() {
  const orders = getOrdersRaw()
  return orders.concat(buildVirtualGroupOrders(orders))
}

function getOrders(status) {
  return getCombinedOrdersRaw()
    .filter((order) => !status || order.status === status)
    .map(enrichOrder)
}

function getOrderCounts() {
  const orders = getCombinedOrdersRaw()
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
  const address = getUserAddress()

  if (!address.isComplete) {
    return { ok: false, message: '请先完善我的地址' }
  }

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
      contact: {
        name: address.name,
        phone: address.phone,
        address: address.detail
      },
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
        avatarUrl: user.avatarUrl || '',
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
            avatarUrl: user.avatarUrl || '',
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
    contact: {
      name: address.name,
      phone: address.phone,
      address: address.detail
    },
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

async function createOrderFromCheckoutAsync(remark) {
  const user = getUser()

  if (user.loggedIn && !user.openid) {
    await prepareCloudIdentity()
  }

  await syncSharedData()
  const result = createOrderFromCheckout(remark)

  if (result.ok && result.order) {
    const orderSyncResult = await publishOrderToCloud(result.order)
    result.orderCloudSynced = orderSyncResult.ok
    result.orderCloudMessage = orderSyncResult.message || ''
  }

  if (result.ok && result.groupId) {
    const syncResult = await publishGroupChange(result.groupId)
    result.cloudSynced = syncResult.ok
    result.cloudMessage = syncResult.message || ''
  }

  return result
}

function updateOrderStatus(orderId, status) {
  const orders = getOrdersRaw().map((order) => (
    order.id === orderId ? { ...order, status } : order
  ))
  saveOrdersRaw(orders)

  const order = orders.find((item) => item.id === orderId)

  if (order) {
    publishOrderToCloud(order).catch((error) => {
      console.warn('publish order status failed', error)
    })
  }
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

function migrateUserReferences(fromId, user) {
  if (!fromId || !user) {
    return []
  }

  const matchIds = [fromId, user.id].filter(Boolean)
  const affectedGroupIds = []
  const groups = getGroupsRaw().map((group) => {
    let changed = false
    const members = (group.members || []).map((member) => {
      if (!matchIds.includes(member.userId)) {
        return member
      }

      changed = true
      return {
        ...member,
        userId: user.id,
        nickName: user.nickName,
        avatarText: user.avatarText,
        avatarUrl: user.avatarUrl || member.avatarUrl || ''
      }
    })
    const leaderChanged = group.leaderId === fromId

    if (changed || leaderChanged) {
      affectedGroupIds.push(group.id)
    }

    return {
      ...group,
      leaderId: group.leaderId === fromId ? user.id : group.leaderId,
      members
    }
  })

  if (affectedGroupIds.length) {
    saveGroupsRaw(groups)
  }

  return affectedGroupIds
}

function getUser() {
  return normalizeUser(getStorage(USER_KEY, null))
}

function login() {
  const id = getClientUserId()
  const nickName = `微信用户${id.slice(-4)}`
  const user = {
    id,
    openid: getStorage(USER_OPENID_KEY, ''),
    loggedIn: true,
    nickName,
    avatarText: getAvatarText(nickName),
    avatarUrl: '',
    profileSynced: false
  }

  setStorage(USER_KEY, user)
  return user
}

function loginWithProfile(profile = {}) {
  const current = getUser()
  const openid = profile.openid || getStorage(USER_OPENID_KEY, '')
  const cloudUserId = getCloudUserId(openid)
  const shouldReplaceLegacyId = current.id === 'user_self' && !current.profileSynced
  const id = shouldReplaceLegacyId ? getClientUserId() : (current.id || getClientUserId())
  const nextId = cloudUserId || id
  const nickName = String(profile.nickName || current.nickName || '微信用户').trim()
  const user = {
    id: nextId,
    openid,
    loggedIn: true,
    nickName,
    avatarUrl: profile.avatarUrl || current.avatarUrl || '',
    avatarText: getAvatarText(nickName),
    profileSynced: true
  }

  setStorage(USER_KEY, user)
  if (openid) {
    setStorage(USER_OPENID_KEY, openid)
    setStorage(USER_ID_KEY, nextId)
  }
  migrateAddressReference(current.id, user.id)
  migrateUserReferences(current.id, user)
  const syncTasks = getGroupsRaw()
    .filter((group) => (group.members || []).some((member) => member.userId === user.id))
    .map((group) => publishGroupChange(group.id))

  if (syncTasks.length) {
    Promise.all(syncTasks).catch((error) => {
      console.warn('sync profile to groups failed', error)
    })
  }

  return user
}

function logout() {
  const guest = {
    id: getClientUserId(),
    openid: getStorage(USER_OPENID_KEY, ''),
    loggedIn: false,
    nickName: '未登录用户',
    avatarText: '访',
    avatarUrl: '',
    profileSynced: false
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
  createOrderFromCheckoutAsync,
  enrichProduct,
  enrichProducts,
  getCartSummary,
  getCheckoutSummary,
  getFavoriteProducts,
  getGroupById,
  getOrderCounts,
  getOrders,
  getPickupPoint,
  getUserAddress,
  getVisibleGroups,
  getUser,
  isFavorite,
  login,
  loginWithProfile,
  logout,
  mock,
  money,
  prepareCloudIdentity,
  publishOrderToCloud,
  removeCartItem,
  setGroupCheckout,
  setCheckoutItems,
  saveUserAddress,
  syncCatalogFromCloud,
  syncSharedData,
  toggleAllCartItems,
  toggleCartItem,
  toggleFavorite,
  updateCartQuantity,
  updateOrderStatus
}
