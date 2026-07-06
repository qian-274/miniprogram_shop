# CloudBase 店主端与后台初始化说明

本文档用于配合 PRD 第 22 章落地“单小程序多角色 + 微信云开发 CloudBase + 数据模型可视化后台”方案。

## 1. 需要部署的云函数

在微信开发者工具中进入“云开发”，分别上传并部署：

- `getOpenId`：当前项目已有，用于获取用户 openid。
- `ownerApi`：店主端接口，用于校验店主、自提点订单查询、商品汇总、收货人列表、自提点设置。
- `adminApi`：后台管理兜底接口，用于管理员查询和更新商品、轮播图、订单。

## 2. 需要创建的集合

建议在 CloudBase 云数据库中创建以下集合：

| 集合 | 用途 |
| --- | --- |
| `users` | 用户信息 |
| `admin_users` | 后台管理员 openid 白名单 |
| `owner_bindings` | 店主与自提点绑定关系 |
| `pickup_points` | 自提点 |
| `categories` | 商品分类 |
| `products` | 商品 |
| `banners` | 首页轮播图 |
| `orders` | 订单 |
| `fresh_groups` | 当前项目已有拼团表 |
| `fresh_group_members` | 当前项目已有拼团成员表 |

## 3. 权限建议

第一版建议这样配置：

- `products`、`categories`、`banners`、`pickup_points`：所有用户可读，仅管理员可写。
- `orders`、`owner_bindings`、`admin_users`：不允许小程序端直接读写，统一通过云函数访问。
- `fresh_groups`、`fresh_group_members`：保持当前项目可用配置；正式版建议也收敛到云函数写入。

## 4. 绑定店主

店主登录小程序后，先在 `users` 或本地调试中拿到该用户的 `openid`。

然后在 `owner_bindings` 新增一条记录：

```json
{
  "ownerOpenid": "店主的openid",
  "pickupId": "happy",
  "status": "active",
  "createdAt": "2026-07-06 12:00",
  "updatedAt": "2026-07-06 12:00"
}
```

`pickupId` 要与 `pickup_points` 中对应自提点的 `_id` 或 `id` 保持一致。

## 5. 配置后台管理员

方式一：在云函数环境变量中配置：

```text
ADMIN_OPENIDS=管理员openid1,管理员openid2
```

方式二：在 `admin_users` 集合新增：

```json
{
  "openid": "管理员openid",
  "status": "active",
  "createdAt": "2026-07-06 12:00"
}
```

## 6. 商品、轮播图、自提点字段

### products

核心字段：

- `_id` 或 `id`：商品编号，如 `orange`
- `categoryId`：分类编号
- `name`：商品名称
- `image`：商品图片
- `spec`：规格
- `desc`：描述
- `price`：普通价
- `originalPrice`：原价
- `groupPrice`：团购价
- `groupEnabled`：是否支持拼团
- `groupSize`：成团人数
- `featured`：是否首页推荐
- `stock`：库存
- `limit`：限购数量
- `status`：`available`、`soldout` 或 `hidden`
- `sort`：排序

### banners

核心字段：

- `_id` 或 `id`
- `title`
- `subtitle`
- `image`
- `targetType`：`product`、`category` 或 `none`
- `targetId`
- `sort`
- `enabled`

### pickup_points

核心字段：

- `_id` 或 `id`
- `name`
- `address`
- `serviceTime`
- `phone`
- `notice`
- `status`：`open` 或 `closed`
- `sort`

## 7. 数据迁移建议

当前项目仍保留 `utils/mock-data.js` 作为演示兜底。正式演示前建议把其中的：

- `categories` 导入 `categories`
- `products` 导入 `products`
- `banners` 导入 `banners`
- `pickupPoints` 导入 `pickup_points`

导入后，首页、分类、详情、搜索、自提点选择页会优先读取云端数据。云端读取失败时，仍会使用本地 mock 数据，方便课堂演示。

## 8. 店主端入口

店主绑定成功后：

1. 店主在“我的”页面使用微信资料登录。
2. 小程序通过 `ownerApi` 校验当前 openid 是否绑定自提点。
3. 校验通过后，“我的”页面展示“自提点店主端”入口。
4. 店主进入后可查看工作台、到店商品、收货人列表、自提点设置。

## 9. 后台管理方式

本项目第一版不单独开发 Web 后台，直接使用 CloudBase 的数据库/数据模型可视化管理能力：

- 改首页轮播图：编辑 `banners`
- 改商品价格、团购价、推荐状态：编辑 `products`
- 改自提点信息和营业状态：编辑 `pickup_points`
- 查看订单：查看 `orders`
- 绑定店主：编辑 `owner_bindings`

这种方式最适合当前毕业设计阶段，开发量小，数据流清楚，也方便演示“后台可管理商品与订单”。
