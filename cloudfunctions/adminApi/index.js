const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const COLLECTIONS = {
  admins: 'admin_users',
  banners: 'banners',
  categories: 'categories',
  orders: 'orders',
  pickups: 'pickup_points',
  products: 'products'
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

function failure(message) {
  return {
    ok: false,
    message
  }
}

function normalizeDoc(doc = {}) {
  return {
    ...doc,
    id: doc.id || doc._id
  }
}

function getEnvAdmins() {
  return String(process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function isAdmin(openid) {
  if (getEnvAdmins().includes(openid)) {
    return true
  }

  try {
    const result = await db
      .collection(COLLECTIONS.admins)
      .where({
        openid,
        status: 'active'
      })
      .limit(1)
      .get()

    return !!(result.data && result.data.length)
  } catch (error) {
    return false
  }
}

async function listCollection(collectionName, limit = 100) {
  const result = await db.collection(collectionName).limit(limit).get()

  return (result.data || []).map(normalizeDoc)
}

async function countCollection(collectionName) {
  try {
    const result = await db.collection(collectionName).count()
    return result.total || 0
  } catch (error) {
    return 0
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

async function updateDoc(collectionName, id, data, fields) {
  if (!id) {
    return failure('缺少记录编号')
  }

  const updateData = pickAllowedFields(data, fields)

  if (!Object.keys(updateData).length) {
    return failure('没有可更新字段')
  }

  updateData.updatedAt = nowText()

  await db.collection(collectionName).doc(id).update({
    data: updateData
  })

  return success({
    id,
    data: updateData
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action || 'getOverview'
  const payload = event.payload || {}

  if (!OPENID) {
    return failure('无法识别当前微信用户')
  }

  if (!(await isAdmin(OPENID))) {
    return failure('当前账号不是后台管理员')
  }

  if (action === 'getOverview') {
    const [bannerCount, productCount, orderCount, pickupCount] = await Promise.all([
      countCollection(COLLECTIONS.banners),
      countCollection(COLLECTIONS.products),
      countCollection(COLLECTIONS.orders),
      countCollection(COLLECTIONS.pickups)
    ])

    return success({
      counts: {
        banners: bannerCount,
        products: productCount,
        orders: orderCount,
        pickups: pickupCount
      }
    })
  }

  if (action === 'listProducts') {
    return success({
      products: await listCollection(COLLECTIONS.products)
    })
  }

  if (action === 'listBanners') {
    return success({
      banners: await listCollection(COLLECTIONS.banners)
    })
  }

  if (action === 'listOrders') {
    return success({
      orders: await listCollection(COLLECTIONS.orders)
    })
  }

  if (action === 'updateProduct') {
    return updateDoc(COLLECTIONS.products, payload.id, payload.data || {}, [
      'name',
      'categoryId',
      'image',
      'spec',
      'desc',
      'price',
      'originalPrice',
      'groupPrice',
      'groupEnabled',
      'groupSize',
      'featured',
      'stock',
      'limit',
      'tag',
      'status',
      'pickupText',
      'sort'
    ])
  }

  if (action === 'updateBanner') {
    return updateDoc(COLLECTIONS.banners, payload.id, payload.data || {}, [
      'title',
      'subtitle',
      'image',
      'targetType',
      'targetId',
      'sort',
      'enabled'
    ])
  }

  if (action === 'updateOrderStatus') {
    return updateDoc(COLLECTIONS.orders, payload.id, payload.data || {}, [
      'status',
      'remark'
    ])
  }

  return failure('未知后台操作')
}
