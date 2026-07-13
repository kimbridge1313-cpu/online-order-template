import { env } from '../config/env'
import { mockProductService } from './mockProductService'
import { firebaseProductService } from './firebaseProductService'

export const productService = env.useMockData ? mockProductService : firebaseProductService
