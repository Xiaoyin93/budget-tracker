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
    start: { year: 2026, month: 5 },
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
      { id: 'rent',      name: '住房', budget: 5554, cur: 'CNY' },
      { id: 'car',       name: '车',   budget: 1666, cur: 'CNY' },
      { id: 'insurance', name: '保险', budget: 1545, cur: 'CNY' },
      { id: 'commute',   name: '交通', budget: 660,  cur: 'CNY' },
      { id: 'phone',     name: '通讯', budget: 100,  cur: 'CNY' },
      { id: 'net',       name: '网络', budget: 100,  cur: 'CNY' }
    ]
  },
  {
    id: 'living',
    title: '日常开销',
    subtitle: '日常生活类支出',
    items: [
      { id: 'food',   name: '餐饮', budget: 2200, cur: 'CNY' },
      { id: 'veg',    name: '蔬菜', budget: 600,  cur: 'CNY' },
      { id: 'daily',  name: '日用', budget: 500,  cur: 'CNY' },
      { id: 'ent',    name: '娱乐', budget: 500,  cur: 'CNY' },
      { id: 'cloth',  name: '服饰', budget: 400,  cur: 'CNY' },
      { id: 'home',   name: '居家', budget: 200,  cur: 'CNY' },
      { id: 'travel', name: '旅行', budget: 500,  cur: 'CNY' },
      { id: 'tech',   name: '数码', budget: 200,  cur: 'CNY' },
      { id: 'med',    name: '医疗', budget: 300,  cur: 'CNY' },
      { id: 'study',  name: '学习', budget: 200,  cur: 'CNY' },
      { id: 'sport',  name: '运动', budget: 200,  cur: 'CNY' },
      { id: 'pet',    name: '宠物', budget: 100,  cur: 'CNY' },
      { id: 'gift',   name: '礼金', budget: 200,  cur: 'CNY' },
      { id: 'gift2',  name: '礼物', budget: 200,  cur: 'CNY' },
      { id: 'work',   name: '办公', budget: 100,  cur: 'CNY' },
      { id: 'family', name: '亲友', budget: 200,  cur: 'CNY' },
      { id: 'parcel', name: '快递', budget: 100,  cur: 'CNY' },
      { id: 'donate', name: '捐赠', budget: 0,    cur: 'CNY' },
      { id: 'other',  name: '其他', budget: 200,  cur: 'CNY' }
    ]
  },
  {
    id: 'savings',
    title: '储蓄 + 投资',
    subtitle: '多币种池子（按总目标统计，不做单项预算）',
    // 整组总预算（CNY 等值）。设置后会忽略下方 item 的 budget 字段。
    totalBudgetCNY: 10939,
    items: [
      { id: 'rmb_save', name: 'RMB 储蓄', budget: 0, cur: 'CNY' },
      { id: 'hkd_save', name: 'HKD 储蓄', budget: 0, cur: 'HKD' },
      { id: 'invest',   name: '投资理财', budget: 0, cur: 'HKD' }
    ]
  }
];
