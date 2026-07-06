export const env = {
  appName: import.meta.env.VITE_APP_NAME || '線上訂餐系統',
  storeName: import.meta.env.VITE_STORE_NAME || '示範店家',
  lineOfficialAccountUrl: import.meta.env.VITE_LINE_OFFICIAL_ACCOUNT_URL || '',
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false'
}
