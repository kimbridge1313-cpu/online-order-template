export function validateRequiredOptions(product, selections) {
  const missing = []
  for (const group of product.optionGroups || []) {
    if (!group.required) continue
    const value = selections[group.id]
    const empty = Array.isArray(value) ? value.length === 0 : !value
    if (empty) missing.push(group.name)
  }
  return missing
}

export function flattenSelectedOptions(product, selections) {
  const result = []
  for (const group of product.optionGroups || []) {
    const value = selections[group.id]
    const values = Array.isArray(value) ? value : value ? [value] : []
    for (const optionId of values) {
      const option = group.options.find((item) => item.id === optionId)
      if (!option) continue
      result.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: Number(option.priceDelta || 0)
      })
    }
  }
  return result
}
