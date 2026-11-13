const buildingsData = require('./buildings')

/** 部分楼层跳过（常见避讳层） */
const DEFAULT_SKIP_FLOORS = [4, 13, 14, 24]
const DEFAULT_COMMUNITY_ID = 'hengda_mingdu'

let roomCache = null

function formatRoomNo(floor, roomIndex) {
  return `${floor}${String(roomIndex).padStart(2, '0')}`
}

/** 兼容旧单小区结构与多小区结构 */
function getCommunitiesRaw() {
  if (buildingsData.communities && buildingsData.communities.length) {
    return buildingsData.communities
  }
  return [{
    id: DEFAULT_COMMUNITY_ID,
    name: buildingsData.communityName || '宜昌·恒大名都',
    address: buildingsData.address || '',
    phases: buildingsData.phases || []
  }]
}

function getDefaultCommunityId() {
  return buildingsData.defaultCommunityId || DEFAULT_COMMUNITY_ID
}

function findCommunity(communityId) {
  const id = communityId || getDefaultCommunityId()
  const list = getCommunitiesRaw()
  return list.find(c => c.id === id) || list[0]
}

function listCommunities() {
  return getCommunitiesRaw().map(c => {
    const phases = c.phases || []
    return {
      id: c.id,
      name: c.name,
      address: c.address || '',
      hasPhases: phases.length > 0,
      phases: phases.map(p => ({ id: p.id, name: p.name }))
    }
  })
}

function buildAllRooms() {
  if (roomCache) {
    return roomCache
  }
  const rooms = []
  const defaultId = getDefaultCommunityId()
  getCommunitiesRaw().forEach(community => {
    const phases = community.phases || []
    const isDefault = community.id === defaultId
    phases.forEach(phase => {
      phase.buildings.forEach(building => {
        const skipFloors = building.skipFloors || DEFAULT_SKIP_FLOORS
        for (let floor = 1; floor <= building.maxFloor; floor += 1) {
          if (skipFloors.indexOf(floor) >= 0) {
            continue
          }
          for (let roomIndex = 1; roomIndex <= building.roomsPerFloor; roomIndex += 1) {
            const unit = homeUnit(building.units, building.roomsPerFloor, roomIndex)
            const roomNo = formatRoomNo(floor, roomIndex)
              const id = isDefault
                ? `${phase.id}_${building.id}_${unit}_${roomNo}`
                : `${community.id}_${phase.id}_${building.id}_${unit}_${roomNo}`
              const label = `${community.name} ${phase.name}${building.name} ${unit}单元 ${roomNo}`
              const searchKey = `${community.name}${phase.name}${building.name}${unit}单元${roomNo}${building.name.replace('号楼', '')}${roomNo}`
              rooms.push({
                id,
                communityId: community.id,
                communityName: community.name,
                phaseId: phase.id,
                phaseName: phase.name,
                buildingId: building.id,
                buildingName: building.name,
                unit,
                roomNo,
                label,
                searchKey: searchKey.toLowerCase()
              })
          }
        }
      })
    })
  })
  roomCache = rooms
  return rooms
}

function homeUnit(units, roomsPerFloor, roomIndex) {
  if (units <= 1) return 1
  const right = roomsPerFloor >= 4 ? (roomIndex === 2 || roomIndex === 4) : roomIndex === 2
  return right ? 2 : 1
}

function getPhases(communityId) {
  const community = findCommunity(communityId)
  const phases = (community && community.phases) || []
  return phases.map(phase => ({
    id: phase.id,
    name: phase.name,
    buildings: phase.buildings.map(b => ({
      id: b.id,
      name: b.name,
      units: b.units,
      maxFloor: b.maxFloor,
      roomsPerFloor: b.roomsPerFloor
    }))
  }))
}

function getBuildingsByPhase(phaseId, communityId) {
  const phase = getPhases(communityId).find(p => p.id === phaseId)
  return phase ? phase.buildings : []
}

function getRoomsByBuilding(communityIdOrPhaseId, phaseIdOrBuildingId, buildingIdOrUnit, unitMaybe) {
  // 兼容旧调用: (phaseId, buildingId, unit)
  let communityId
  let phaseId
  let buildingId
  let unit
  if (unitMaybe !== undefined || (arguments.length >= 4)) {
    communityId = communityIdOrPhaseId
    phaseId = phaseIdOrBuildingId
    buildingId = buildingIdOrUnit
    unit = unitMaybe
  } else {
    communityId = getDefaultCommunityId()
    phaseId = communityIdOrPhaseId
    buildingId = phaseIdOrBuildingId
    unit = buildingIdOrUnit
  }
  const cid = communityId || getDefaultCommunityId()
  return buildAllRooms().filter(room => {
    if (room.communityId !== cid || room.phaseId !== phaseId || room.buildingId !== buildingId) {
      return false
    }
    if (unit && room.unit !== unit) {
      return false
    }
    return true
  })
}

function getRoomById(roomId) {
  return buildAllRooms().find(room => room.id === roomId) || null
}

function searchRooms(keyword, limit = 30, communityId) {
  const key = (keyword || '').trim().toLowerCase()
  if (!key) {
    return []
  }
  const cid = communityId || getDefaultCommunityId()
  return buildAllRooms()
    .filter(room => room.communityId === cid && room.searchKey.indexOf(key) >= 0)
    .slice(0, limit)
}

function getCommunityInfo(communityId) {
  const community = findCommunity(communityId)
  const phases = (community && community.phases) || []
  return {
    id: community.id,
    communityName: community.name,
    name: community.name,
    address: community.address || '',
    phaseCount: phases.length,
    hasPhases: phases.length > 0,
    buildingCount: phases.reduce((sum, p) => sum + (p.buildings ? p.buildings.length : 0), 0)
  }
}

module.exports = {
  listCommunities,
  getPhases,
  getBuildingsByPhase,
  getRoomsByBuilding,
  getRoomById,
  searchRooms,
  getCommunityInfo,
  buildAllRooms,
  getDefaultCommunityId
}
