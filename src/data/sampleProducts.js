export const sampleProducts = [
  {
    id: 'black-tea',
    name: '古早味紅茶',
    category: '飲品',
    price: 35,
    description: '清爽茶香，適合搭配餐點。',
    imageUrl: '',
    isAvailable: true,
    sortOrder: 1,
    optionGroups: [
      {
        id: 'temperature',
        name: '溫度',
        type: 'single',
        required: true,
        options: [
          { id: 'cold', name: '冷', priceDelta: 0 },
          { id: 'hot', name: '熱', priceDelta: 0 }
        ]
      },
      {
        id: 'sweetness',
        name: '甜度',
        type: 'single',
        required: true,
        options: [
          { id: 'less-sugar', name: '少甜', priceDelta: 0 },
          { id: 'no-sugar', name: '無糖', priceDelta: 0 }
        ]
      }
    ]
  },
  {
    id: 'milk-tea',
    name: '招牌奶茶',
    category: '飲品',
    price: 50,
    description: '茶香與奶香比例均衡。',
    imageUrl: '',
    isAvailable: true,
    sortOrder: 2,
    optionGroups: [
      {
        id: 'temperature',
        name: '溫度',
        type: 'single',
        required: true,
        options: [
          { id: 'cold', name: '冷', priceDelta: 0 },
          { id: 'hot', name: '熱', priceDelta: 0 }
        ]
      },
      {
        id: 'sweetness',
        name: '甜度',
        type: 'single',
        required: true,
        options: [
          { id: 'regular-sugar', name: '正常甜', priceDelta: 0 },
          { id: 'less-sugar', name: '少甜', priceDelta: 0 },
          { id: 'no-sugar', name: '無糖', priceDelta: 0 }
        ]
      },
      {
        id: 'toppings',
        name: '加料',
        type: 'multiple',
        required: false,
        options: [
          { id: 'pearls', name: '珍珠', priceDelta: 10 },
          { id: 'pudding', name: '布丁', priceDelta: 15 }
        ]
      }
    ]
  },
  {
    id: 'pork-rice',
    name: '滷肉飯',
    category: '主餐',
    price: 65,
    description: '櫃檯與線上都可點。',
    imageUrl: '',
    isAvailable: true,
    sortOrder: 3,
    optionGroups: [
      {
        id: 'spicy',
        name: '辣度',
        type: 'single',
        required: false,
        options: [
          { id: 'none', name: '不辣', priceDelta: 0 },
          { id: 'mild', name: '小辣', priceDelta: 0 }
        ]
      },
      {
        id: 'addons',
        name: '加購',
        type: 'multiple',
        required: false,
        options: [
          { id: 'egg', name: '滷蛋', priceDelta: 15 },
          { id: 'rice-more', name: '加飯', priceDelta: 10 }
        ]
      }
    ]
  },
  {
    id: 'combo-a',
    name: '午餐套餐 A',
    category: '套餐',
    price: 120,
    description: '主餐搭配飲品。',
    imageUrl: '',
    isAvailable: true,
    sortOrder: 4,
    optionGroups: [
      {
        id: 'drink-choice',
        name: '飲品選擇',
        type: 'single',
        required: true,
        options: [
          { id: 'black-tea', name: '紅茶', priceDelta: 0 },
          { id: 'milk-tea', name: '奶茶', priceDelta: 10 }
        ]
      }
    ]
  }
]
