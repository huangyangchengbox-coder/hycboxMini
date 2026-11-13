/**
 * 宜昌恒大名都 1/2/3 期楼栋固定数据（内置默认小区）
 * 门牌按整栋一层户数生成：1、2、15 栋每层 4 户（两前两后），其余每层 3 户（前二后一）
 */
const phases = [
  {
    id: 'phase1',
    name: '一期',
    buildings: [
      { id: '1', name: '1号楼', units: 1, maxFloor: 33, roomsPerFloor: 4 },
      { id: '2', name: '2号楼', units: 2, maxFloor: 33, roomsPerFloor: 4 },
      { id: '3', name: '3号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '4', name: '4号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '5', name: '5号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '6', name: '6号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '7', name: '7号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '8', name: '8号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '10', name: '10号楼', units: 1, maxFloor: 33, roomsPerFloor: 3 }
    ]
  },
  {
    id: 'phase2',
    name: '二期',
    buildings: [
      { id: '13', name: '13号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '14', name: '14号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '15', name: '15号楼', units: 2, maxFloor: 33, roomsPerFloor: 4 },
      { id: '16', name: '16号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '17', name: '17号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '18', name: '18号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '19', name: '19号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '20', name: '20号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '21', name: '21号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '22', name: '22号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '23', name: '23号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '24', name: '24号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '25', name: '25号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '26', name: '26号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '27', name: '27号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '28', name: '28号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '29', name: '29号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '30', name: '30号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '31', name: '31号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: 'B3', name: 'B3号楼', units: 1, maxFloor: 33, roomsPerFloor: 3 }
    ]
  },
  {
    id: 'phase3',
    name: '三期',
    buildings: [
      { id: '11', name: '11号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '12', name: '12号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '33', name: '33号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '34', name: '34号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '36', name: '36号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 },
      { id: '40', name: '40号楼', units: 2, maxFloor: 33, roomsPerFloor: 3 }
    ]
  }
]

module.exports = {
  defaultCommunityId: 'hengda_mingdu',
  communities: [
    {
      id: 'hengda_mingdu',
      name: '宜昌·恒大名都',
      address: '夷陵区东城大道与东方大道交汇处',
      phases
    }
  ],
  // 兼容旧引用
  communityName: '宜昌·恒大名都',
  address: '夷陵区东城大道与东方大道交汇处',
  phases
}
