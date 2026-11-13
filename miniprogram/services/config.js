/**
 * 服务配置
 * 体验版、开发版、正式版都使用同一个正式服务。
 */
const PROD_API = 'https://hychyr.top/api'

function resolveBaseUrl() {
  return PROD_API
}

module.exports = {
  useMock: false,
  baseUrl: resolveBaseUrl(),
  timeout: 20000,
  prodApi: PROD_API,
  trialApi: PROD_API,
  /** 仙途游戏图：走后台 uploads，不进小程序主包 */
  gameAssetBase: 'https://hychyr.top/uploads/game/xian',
  /**
   * 开发版 / 体验版：true；正式版：false。
   * 用于仙途跳境调试等仅非生产可用的能力。
   */
  isDevOrTrialEnv() {
    try {
      const info = wx.getAccountInfoSync()
      const env = info && info.miniProgram && info.miniProgram.envVersion
      return env !== 'release'
    } catch (e) {
      return true
    }
  }
}
