// 预算配置
// 修改这个文件来调整预算数字、分类、汇率等

export const CONFIG = {
  // 汇率：1 HKD = 多少 CNY
  // 建议每季度更新一次
  exchangeRate: 0.87,

  // 月收入（港币）
  incomeHKD: 30000,

  // 月份范围（选择器显示）
  monthRange: {
    start: { year: 2026, month: 6 },
    end: { year: 2028, month: 12 }
  },

  // 储蓄率目标
  savingsRateTarget: 0.35,
};

export const SECTIONS = [
  {
    id: 'fixed',
    title: '固定开销',
    subtitle: '刚性支出，基本不变',
    items: [
      { id: 'rent', name: '房租 + 杂费', budget: 5554, cur: 'CNY' },
      { id: 'car', name: '车贷', budget: 1666, cur: 'CNY' },
      { id: 'social', name: '社保', budget: 1514, cur: 'CNY' },
      { id: 'commute', name: '通勤', budget: 660, cur: 'CNY' },
      { id: 'insurance', name: '其他保险', budget: 300, cur: 'CNY' },
      { id: 'sub', name: '会员订阅', budget: 200, cur: 'CNY' },
      { id: 'phone', name: '电话费', budget: 100, cur: 'CNY' }
    ]
  },
  {
    id: 'living',
    title: '日常生活',
    subtitle: '激进压缩版',
    items: [
      { id: 'food', name: '餐饮', budget: 2200, cur: 'CNY' },
      { id: 'ent', name: '娱乐 / 社交', budget: 500, cur: 'CNY' },
      { id: 'flex', name: '弹性缓冲', budget: 500, cur: 'CNY' },
      { id: 'daily', name: '日用品', budget: 500, cur: 'CNY' },
      { id: 'care', name: '个人护理', budget: 400, cur: 'CNY' },
      { id: 'cloth', name: '服饰（月摊）', budget: 400, cur: 'CNY' },
      { id: 'health', name: '健康 / 运动', budget: 500, cur: 'CNY' }
    ]
  },
  {
    id: 'savings',
    title: '储蓄 + 投资',
    subtitle: '多币种池子',
    items: [
      { id: 'rmb_em', name: 'RMB 应急金', budget: 2500, cur: 'CNY' },
      { id: 'invest', name: '基金定投', budget: 2000, cur: 'HKD' },
      { id: 'hkd_em', name: '港币应急金', budget: 2875, cur: 'HKD' },
      { id: 'wedding', name: '婚礼基金', budget: 4800, cur: 'HKD' },
      { id: 'buffer', name: '港币活期缓冲', budget: 25, cur: 'HKD' }
    ]
  }
];
