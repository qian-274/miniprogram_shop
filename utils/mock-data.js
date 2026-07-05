const categories = [
  {
    id: 'fruit',
    name: '新鲜水果',
    icon: '果',
    slogan: '当季鲜果 · 今日特价',
    banner: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'vegetable',
    name: '时令蔬菜',
    icon: '蔬',
    slogan: '清晨到货 · 餐桌常备',
    banner: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'meat',
    name: '禽畜肉类',
    icon: '肉',
    slogan: '冷链直达 · 新鲜放心',
    banner: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'egg',
    name: '蛋品采购',
    icon: '蛋',
    slogan: '家庭早餐 · 每日补给',
    banner: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'seasoning',
    name: '粮油调味',
    icon: '油',
    slogan: '厨房基础 · 量贩更省',
    banner: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'dairy',
    name: '新鲜乳品',
    icon: '乳',
    slogan: '早餐搭档 · 冷藏配送',
    banner: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'grain',
    name: '五谷杂粮',
    icon: '谷',
    slogan: '粗粮优选 · 家庭囤货',
    banner: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'dry',
    name: '干货菌菇',
    icon: '菇',
    slogan: '煲汤配菜 · 鲜香耐放',
    banner: 'https://images.unsplash.com/photo-1605810620434-bbf2f67f602f?auto=format&fit=crop&w=900&q=80'
  }
]

const products = [
  {
    id: 'grape',
    categoryId: 'fruit',
    name: '自家果园葡萄 甜滋滋',
    price: 26.8,
    originalPrice: 35.8,
    image: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=900&q=80',
    spec: '约 2 斤 / 盒',
    desc: '当日采摘、社区自提，果粒紧实，适合家庭日常采购和下午茶水果搭配。',
    stock: 36,
    limit: 6,
    sales: 126,
    group: true,
    featured: false,
    tag: '限时拼团',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'orange',
    categoryId: 'fruit',
    name: '清甜多汁蜜橘 5 斤装',
    price: 32.6,
    originalPrice: 42.9,
    image: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=900&q=80',
    spec: '5 斤装 / 产地直采',
    desc: '皮薄汁足，家庭装更适合办公室分享和晚餐后水果补给。',
    stock: 48,
    limit: 4,
    sales: 98,
    group: true,
    featured: true,
    tag: '3 人团',
    status: 'available',
    pickup: '今日 18:00 后可取'
  },
  {
    id: 'banana',
    categoryId: 'fruit',
    name: '高山香蕉家庭装',
    price: 18.9,
    originalPrice: 24.9,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80',
    spec: '约 3 斤 / 袋',
    desc: '自然熟化，软糯香甜，早餐、加餐都方便。',
    stock: 52,
    limit: 5,
    sales: 76,
    group: false,
    featured: true,
    tag: '精选',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'apple',
    categoryId: 'fruit',
    name: '脆甜红苹果精选装',
    price: 29.9,
    originalPrice: 39.9,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
    spec: '约 4 斤 / 箱',
    desc: '果面干净，口感脆甜，多汁耐放。',
    stock: 30,
    limit: 4,
    sales: 63,
    group: false,
    featured: true,
    tag: '应季',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'greens',
    categoryId: 'vegetable',
    name: '应季蔬菜组合包',
    price: 19.9,
    originalPrice: 25.9,
    image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=80',
    spec: '小家庭一日鲜菜搭配',
    desc: '包含绿叶菜、根茎菜和菌菇，按当天到货灵活搭配。',
    stock: 42,
    limit: 3,
    sales: 211,
    group: false,
    featured: true,
    tag: '今日精选',
    status: 'available',
    pickup: '今日 19:00 后可取'
  },
  {
    id: 'tomato',
    categoryId: 'vegetable',
    name: '沙瓤番茄 3 斤装',
    price: 15.8,
    originalPrice: 20.8,
    image: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?auto=format&fit=crop&w=900&q=80',
    spec: '约 3 斤 / 盒',
    desc: '酸甜平衡，适合凉拌、炒蛋和煲汤。',
    stock: 58,
    limit: 5,
    sales: 147,
    group: false,
    featured: true,
    tag: '热卖',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'pork',
    categoryId: 'meat',
    name: '冷鲜猪梅花肉',
    price: 38.8,
    originalPrice: 46.8,
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80',
    spec: '约 500g / 份',
    desc: '冷链到站，肥瘦均匀，适合煎炒和家常炖煮。',
    stock: 22,
    limit: 3,
    sales: 45,
    group: true,
    featured: false,
    tag: '肉类团',
    status: 'available',
    pickup: '明日 17:00 后可取'
  },
  {
    id: 'chicken',
    categoryId: 'meat',
    name: '鲜切鸡腿块',
    price: 24.8,
    originalPrice: 32.8,
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=80',
    spec: '约 600g / 盒',
    desc: '分切干净，适合红烧、咖喱和空气炸锅。',
    stock: 34,
    limit: 4,
    sales: 82,
    group: false,
    featured: true,
    tag: '冷链',
    status: 'available',
    pickup: '明日 17:00 后可取'
  },
  {
    id: 'eggs',
    categoryId: 'egg',
    name: '散养土鸡蛋 30 枚',
    price: 39.9,
    originalPrice: 49.9,
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=80',
    spec: '30 枚 / 盒',
    desc: '颗颗精选，早餐和烘焙都适合。',
    stock: 0,
    limit: 2,
    sales: 186,
    group: true,
    featured: false,
    tag: '已售罄',
    status: 'soldout',
    pickup: '补货中'
  },
  {
    id: 'oil',
    categoryId: 'seasoning',
    name: '压榨菜籽油 5L',
    price: 69.9,
    originalPrice: 82,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
    spec: '5L / 桶',
    desc: '家常烹饪基础油，香气自然，适合囤货。',
    stock: 18,
    limit: 2,
    sales: 38,
    group: false,
    featured: true,
    tag: '厨房必备',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'milk',
    categoryId: 'dairy',
    name: '低温鲜牛奶 950ml',
    price: 16.8,
    originalPrice: 22,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80',
    spec: '950ml / 瓶',
    desc: '冷藏配送，早餐和咖啡都适合。',
    stock: 45,
    limit: 6,
    sales: 132,
    group: false,
    featured: true,
    tag: '冷藏',
    status: 'available',
    pickup: '今日 19:00 后可取'
  },
  {
    id: 'oats',
    categoryId: 'grain',
    name: '燕麦杂粮早餐包',
    price: 28.8,
    originalPrice: 36.8,
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80',
    spec: '1kg / 袋',
    desc: '搭配牛奶或酸奶，适合作为高纤早餐。',
    stock: 26,
    limit: 4,
    sales: 59,
    group: false,
    featured: false,
    tag: '五谷',
    status: 'available',
    pickup: '明日 16:00 后可取'
  },
  {
    id: 'mushroom',
    categoryId: 'dry',
    name: '山珍菌菇煲汤包',
    price: 33.8,
    originalPrice: 45.8,
    image: 'https://images.unsplash.com/photo-1605810620434-bbf2f67f602f?auto=format&fit=crop&w=900&q=80',
    spec: '260g / 袋',
    desc: '香菇、茶树菇、竹荪组合，煲汤提鲜更省心。',
    stock: 24,
    limit: 3,
    sales: 41,
    group: true,
    featured: false,
    tag: '煲汤团',
    status: 'available',
    pickup: '明日 16:00 后可取'
  }
]

const banners = [
  {
    id: 'orange',
    title: '周末鲜果团',
    subtitle: '蜜橘 3 人团低至 ¥32.6',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=80'
  },
  {
    id: 'greens',
    title: '今日到站鲜菜',
    subtitle: '一日蔬菜组合包 ¥19.9',
    image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=80'
  },
  {
    id: 'pork',
    title: '冷链肉类专场',
    subtitle: '社区自提，新鲜更安心',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1000&q=80'
  }
]

const orderStatuses = [
  { key: 'pending_ship', name: '待发货', icon: '包', action: '查看详情' },
  { key: 'pending_receive', name: '待收货', icon: '车', action: '确认收货' },
  { key: 'pending_comment', name: '待评价', icon: '评', action: '去评价' },
  { key: 'completed', name: '已完成', icon: '成', action: '查看详情' }
]

const pickupInfo = {
  name: '幸福社区自提点',
  address: '幸福花园 2 号门便利店旁',
  time: '明日 16:00-20:00 可取'
}

const defaultContact = {
  name: '小刘',
  phone: '138****8899'
}

const defaultUser = {
  loggedIn: true,
  nickName: '小刘',
  avatarText: '刘'
}

function getCategory(id) {
  return categories.find((item) => item.id === id) || categories[0]
}

function getProduct(id) {
  return products.find((item) => item.id === id)
}

function getProductsByCategory(categoryId) {
  return products.filter((item) => item.categoryId === categoryId)
}

function searchProducts(keyword) {
  const key = String(keyword || '').trim().toLowerCase()

  if (!key) {
    return []
  }

  return products.filter((item) => {
    const category = getCategory(item.categoryId)
    const text = [
      item.name,
      item.spec,
      item.desc,
      item.tag,
      category && category.name
    ].join(' ').toLowerCase()

    return text.includes(key)
  })
}

module.exports = {
  banners,
  categories,
  defaultContact,
  defaultUser,
  getCategory,
  getProduct,
  getProductsByCategory,
  orderStatuses,
  pickupInfo,
  products,
  searchProducts
}
