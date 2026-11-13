const config = require('./config')
const mockStore = require('./mockStore')
const buildingHelper = require('../data/buildingHelper')

function getAdminToken() {
  const app = getApp()
  return (app && app.globalData && app.globalData.adminToken) || wx.getStorageSync('hyc_admin_token') || ''
}

function adminHeader(extra) {
  const header = Object.assign({ 'Content-Type': 'application/json' }, extra || {})
  const token = getAdminToken()
  if (token) {
    header['X-Admin-Token'] = token
  }
  return header
}

function request(options) {
  const method = (options.method || 'GET').toUpperCase()
  // baseUrl 可覆盖：扫码票据带 t/p 前缀时打到对应环境 API
  const root = options.baseUrl || config.baseUrl
  let url = `${root}${options.url}`
  let data = options.data || {}

  // GET：参数拼到 URL；不要带 json Content-Type，避免部分基础库异常
  const header = {}
  if (options.admin) {
    const token = getAdminToken()
    if (token) {
      header['X-Admin-Token'] = token
    }
  }
  if (method !== 'GET') {
    header['Content-Type'] = 'application/json'
  }
  if (options.header) {
    Object.assign(header, options.header)
  }

  if (method === 'GET' && data && typeof data === 'object') {
    const qs = Object.keys(data)
      .filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      .join('&')
    if (qs) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + qs
    }
    data = {}
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header,
      timeout: options.timeout || config.timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data
          if (typeof body === 'string') {
            try {
              resolve(JSON.parse(body))
            } catch (e) {
              reject(new Error('响应解析失败'))
            }
            return
          }
          resolve(body || {})
        } else {
          reject(new Error((res.data && res.data.message) || ('请求失败 ' + res.statusCode)))
        }
      },
      fail(err) {
        const msg = (err && (err.errMsg || err.message)) || '网络请求失败'
        reject(new Error(msg))
      }
    })
  })
}

function wrapMock(promiseFn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(promiseFn())
      } catch (err) {
        reject(err)
      }
    }, 200)
  })
}

function getUserId() {
  const app = getApp()
  if (app && app.globalData && app.globalData.userId) {
    return app.globalData.userId
  }
  // 仅使用微信 openid，禁止本地伪造 user_* 身份
  const openid = wx.getStorageSync('hyc_openid')
  if (openid) {
    if (app && app.globalData) {
      app.globalData.userId = openid
    }
    return openid
  }
  return ''
}

function requireUserId() {
  const userId = getUserId()
  if (!userId) {
    throw new Error('请先登录微信')
  }
  return userId
}

/** 兼容分页：{list,total,page,pageSize} → 数组，并保留 pageInfo */
function normalizeListResponse(res) {
  if (!res || res.code !== 0 || !res.data || Array.isArray(res.data)) {
    return res
  }
  const pageInfo = res.data
  return Object.assign({}, res, {
    data: pageInfo.list || [],
    pageInfo
  })
}

const api = {
  /** POST /admin/login  body: { username, password } */
  adminLogin(username, password) {
    if (config.useMock) {
      return wrapMock(() => {
        throw new Error('Mock 已关闭，请连接真实后端')
      })
    }
    return request({
      url: '/admin/login',
      method: 'POST',
      data: { username, password, client: 'mp' }
    })
  },

  /** 体验版和正式版共用正式服务，扫码不再按票据前缀分库 */
  apiBaseForTicket() {
    return config.baseUrl
  },

  /** POST /admin/qr-login/scan 小程序扫码 */
  scanQrLogin(ticket) {
    return request({
      url: '/admin/qr-login/scan',
      method: 'POST',
      data: { ticket },
      baseUrl: this.apiBaseForTicket(ticket)
    })
  },

  /** POST /admin/qr-login/confirm：用本地 openid 确认 */
  confirmQrLogin(ticket, openid) {
    const oid = (openid || '').trim()
    if (!oid) {
      return Promise.reject(new Error('缺少微信 openid，请先打开小程序完成登录'))
    }
    return request({
      url: '/admin/qr-login/confirm',
      method: 'POST',
      data: { ticket, openid: oid },
      baseUrl: this.apiBaseForTicket(ticket)
    })
  },

  /** GET /admin/users 超级管理员 */
  listAdminUsers() {
    return request({ url: '/admin/users', admin: true })
  },

  /** POST /admin/users 超级管理员添加管理员 */
  createAdminUser(data) {
    return request({ url: '/admin/users', method: 'POST', data, admin: true })
  },

  deleteAdminUser(id) {
    return request({ url: `/admin/users/${id}`, method: 'DELETE', data: {}, admin: true })
  },

  getCommunityInfo() {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.getCommunityInfo() }))
    }
    return request({ url: '/community/info' })
  },

  /** 小区列表（支持多小区扩展）；失败时回退内置宜昌·恒大名都 */
  listCommunities() {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.listCommunities() }))
    }
    return request({ url: '/community/list' }).then(res => {
      if (res && res.code === 0 && res.data && res.data.length) {
        return res
      }
      return { code: 0, data: buildingHelper.listCommunities() }
    }).catch(() => ({ code: 0, data: buildingHelper.listCommunities() }))
  },

  getPhases(communityId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.getPhases(communityId) }))
    }
    return request({ url: '/community/phases', data: communityId ? { communityId } : {} })
  },

  getRooms(params) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.getRoomsByBuilding(
          params.communityId,
          params.phaseId,
          params.buildingId,
          params.unit
        )
      }))
    }
    return request({ url: '/community/rooms', data: params })
  },

  searchRooms(keyword, communityId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.searchRooms(keyword, 30, communityId) }))
    }
    return request({
      url: '/community/rooms/search',
      data: { keyword, communityId: communityId || undefined }
    })
  },

  /** 用户端：按小区/期数筛选发布 */
  listPublications(params) {
    const query = Object.assign({ page: 1, pageSize: 50 }, params || {})
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listPublications(query) }))
    }
    return request({ url: '/publications', data: query }).then(normalizeListResponse)
  },

  /** 用户端：普通物品详情 */
  getPublicationDetail(publicationId) {
    return request({ url: `/publications/${publicationId}` })
  },

  /** 管理者端：仅自己的发布 */
  listAdminPublications(params) {
    const query = Object.assign({ page: 1, pageSize: 50 }, params || {})
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listPublications() }))
    }
    return request({ url: '/admin/publications', data: query, admin: true }).then(normalizeListResponse)
  },

  createPublication(data) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.createPublication(data) }))
    }
    return request({ url: '/publications', method: 'POST', data, admin: true })
  },

  /** 修改单价/库存/标题 */
  updatePublication(id, data) {
    return request({ url: `/publications/${id}`, method: 'PUT', data, admin: true })
  },

  /** 结束活动 */
  endPublication(id) {
    return request({ url: `/publications/${id}/end`, method: 'PUT', data: {}, admin: true })
  },

  createOrder(data) {
    const payload = Object.assign({}, data, { userId: requireUserId() })
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.createOrder(payload) }))
    }
    return request({ url: '/orders', method: 'POST', data: payload })
  },

  /** 取消待处理订单 */
  cancelOrder(orderId) {
    const userId = encodeURIComponent(requireUserId())
    return request({
      url: `/orders/${orderId}/cancel?userId=${userId}`,
      method: 'PUT',
      data: {}
    })
  },

  /** 小区闪送：待配送订单修改门牌 */
  updateOrderAddress(orderId, roomId) {
    return request({
      url: `/orders/${orderId}/address`,
      method: 'PUT',
      data: { roomId, userId: requireUserId() }
    })
  },

  listOrders(params) {
    const query = Object.assign({ page: 1, pageSize: 50 }, params || {})
    if (!query.userId && getApp().globalData.role === 'user') {
      query.userId = requireUserId()
    }
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listOrders(query) }))
    }
    return request({ url: '/orders', data: query }).then(normalizeListResponse)
  },

  /** 管理者：某次发布下登记订单 */
  listAdminOrders(publicationId, params) {
    const query = Object.assign({ publicationId, page: 1, pageSize: 100 }, params || {})
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.listOrders({ publicationId })
      }))
    }
    return request({
      url: '/admin/orders',
      data: query,
      admin: true
    }).then(normalizeListResponse)
  },

  /** 物流中国：按省分组待发货 */
  groupPendingByProvince(publicationId) {
    return request({
      url: '/admin/orders/group-by-province',
      data: { publicationId },
      admin: true
    })
  },

  getOrderDetail(orderId) {
    const admin = !!getAdminToken()
    return request({
      url: `/orders/${orderId}`,
      data: admin ? {} : { userId: requireUserId() },
      admin
    })
  },

  /** 用户查看配送员位置 */
  getCourierLocation(orderId) {
    return request({
      url: `/orders/${orderId}/courier-location`,
      data: { userId: requireUserId() }
    })
  },

  /** 管理员上报/停止配送位置 */
  reportAdminLocation(data) {
    return request({
      url: '/admin/location',
      method: 'POST',
      data: data || {},
      admin: true
    })
  },

  shipOrder(orderId, shipImageUrls) {
    const urls = Array.isArray(shipImageUrls)
      ? shipImageUrls
      : (shipImageUrls ? [shipImageUrls] : [])
    return request({
      url: `/orders/${orderId}/ship`,
      method: 'PUT',
      data: {
        shipImageUrls: urls,
        shipImageUrl: urls[0] || ''
      },
      admin: true
    })
  },

  /** 已发货：更新发货凭证（删图 / 重拍 / 补传） */
  updateShipImages(orderId, shipImageUrls) {
    const urls = Array.isArray(shipImageUrls)
      ? shipImageUrls
      : (shipImageUrls ? [shipImageUrls] : [])
    return request({
      url: `/orders/${orderId}/ship-images`,
      method: 'PUT',
      data: {
        shipImageUrls: urls,
        shipImageUrl: urls[0] || ''
      },
      admin: true
    })
  },

  /** 物流中国：收款核实（pending → paid） */
  verifyPay(orderId, payAmount, payMethod) {
    return request({
      url: `/orders/${orderId}/verify-pay`,
      method: 'PUT',
      data: { payAmount, payMethod },
      admin: true
    })
  },

  /** 物流中国：待收款核实（按省） */
  groupPayVerifyByProvince(publicationId) {
    return request({
      url: '/admin/orders/group-pay-verify',
      data: { publicationId },
      admin: true
    })
  },

  updateAfterSale(orderId, afterSaleRemark, afterSaleImages) {
    return request({
      url: `/orders/${orderId}/after-sale`,
      method: 'PUT',
      data: { afterSaleRemark, afterSaleImages },
      admin: true
    })
  },

  completeOrder(orderId, deliveredQuantity, payAmount, payMethod) {
    const data = { deliveredQuantity }
    if (payAmount != null && payAmount !== '') data.payAmount = payAmount
    if (payMethod) data.payMethod = payMethod
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.completeOrder(orderId, deliveredQuantity)
      }))
    }
    return request({ url: `/orders/${orderId}/complete`, method: 'PUT', data, admin: true })
  },

  /** 首页天气：经纬度由 wx.getLocation 提供 */
  getWeather(latitude, longitude) {
    return request({
      url: '/weather',
      data: { latitude, longitude }
    })
  },

  /** 管理员：通知用户配送员已到门口（订阅消息） */
  notifyArrivedAtDoor(orderId) {
    return request({
      url: `/orders/${orderId}/arrive-door`,
      method: 'PUT',
      admin: true
    })
  },

  groupPendingByBuilding(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.groupPendingByBuilding(publicationId)
      }))
    }
    const data = {}
    if (publicationId && publicationId !== 'all') {
      data.publicationId = publicationId
    }
    return request({ url: '/admin/orders/group-by-building', data, admin: true })
  },

  getAdminStats(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.getAdminStats(publicationId) }))
    }
    const data = {}
    if (publicationId && publicationId !== 'all') {
      data.publicationId = publicationId
    }
    return request({ url: '/admin/stats', data, admin: true })
  },

  /** 管理端顶部提示：轮询未读通知 */
  pollAdminNotices() {
    return request({ url: '/admin/notices', admin: true })
  },

  /** 管理端：通知全部已读 */
  markAdminNoticesRead() {
    return request({ url: '/admin/notices/read-all', method: 'POST', data: {}, admin: true })
  },

  /** 绑定当前管理员 openid（优先本地 openid） */
  bindAdminWx(openid) {
    return request({
      url: '/admin/wx-bind',
      method: 'POST',
      data: { openid: openid || '' },
      admin: true
    })
  },

  /** 账号密码 + openid 绑定小程序号 */
  bindAdminWxByLogin(username, password, openid) {
    return request({
      url: '/admin/wx-bind-login',
      method: 'POST',
      data: { username, password, openid: openid || '' }
    })
  },

  /** 查询 openid 是否已绑定管理员 */
  checkAdminWxBind(openid) {
    return request({
      url: '/admin/wx-bind-check',
      method: 'POST',
      data: { openid: openid || '' }
    })
  },

  grantAdminSubscribe(openid) {
    return request({
      url: '/admin/subscribe/grant',
      method: 'POST',
      data: { openid: openid || '' },
      admin: true
    })
  },

  getAdminSubscribeStatus() {
    return request({ url: '/admin/subscribe/status', admin: true })
  },

  /** 首页业务入口显隐（公开，用户 Hub 用） */
  getHubEntries() {
    return request({ url: '/hub/entries' })
  },

  /** 管理员读取首页入口配置 */
  getAdminHubEntries() {
    return request({ url: '/admin/hub-entries', admin: true })
  },

  /** 管理员更新首页入口显隐 */
  updateHubEntries(data) {
    return request({
      url: '/admin/hub-entries',
      method: 'PUT',
      data: data || {},
      admin: true
    })
  },

  /** 仙途进度：小程序用户 id */
  getXianProgress(userId) {
    return request({
      url: '/xian/progress',
      data: { userId: userId || '' }
    })
  },

  saveXianProgress(data) {
    return request({
      url: '/xian/progress',
      method: 'PUT',
      data: data || {}
    })
  },

  clearXianProgress(userId) {
    const uid = encodeURIComponent(userId || '')
    return request({
      url: '/xian/progress?userId=' + uid,
      method: 'DELETE'
    })
  },

  uploadImage(filePath) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: { url: filePath } }))
    }
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${config.baseUrl}/upload`,
        filePath,
        name: 'file',
        header: {
          'X-Admin-Token': getAdminToken()
        },
        success(res) {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error('上传失败: HTTP ' + res.statusCode))
            return
          }
          try {
            const data = JSON.parse(res.data)
            if (data.code !== 0) {
              reject(new Error(data.message || '上传失败'))
              return
            }
            resolve(data)
          } catch (e) {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: reject
      })
    })
  }
}

module.exports = api
