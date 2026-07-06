export const sampleOptionTemplates = [
  {
    id: 'drink-basic',
    name: '飲品基本選項',
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
          { id: 'coconut-jelly', name: '椰果', priceDelta: 10 }
        ]
      }
    ]
  }
]
