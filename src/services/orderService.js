import { env } from '../config/env'
import { mockOrderService } from './mockOrderService'
import { firebaseOrderService } from './firebaseOrderService'

export const orderService = env.useMockData ? mockOrderService : firebaseOrderService
