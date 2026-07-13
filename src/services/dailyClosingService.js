import { env } from '../config/env'
import { mockDailyClosingService } from './mockDailyClosingService'
import { firebaseDailyClosingService } from './firebaseDailyClosingService'

export const dailyClosingService = env.useMockData ? mockDailyClosingService : firebaseDailyClosingService
