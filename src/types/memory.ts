// Database entity types

export interface User {
  id: string
  email: string
  name: string
  api_key_hash: string
  is_active: number // SQLite boolean (0/1)
  created_at: string
}

export interface Entity {
  id: string
  user_id: string
  entity_type: string
  name: string
  description?: string
  metadata: string // JSON string
  created_at: string
  updated_at: string
}

export interface Memory {
  id: string
  user_id: string
  entity_id: string
  memory_type: string
  title: string
  content: string
  metadata: string // JSON string
  importance: number
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  user_id: string
  entity_id: string
  user_input: string
  assistant_response: string
  context: string // JSON string
  metadata: string // JSON string
  created_at: string
}

export interface LearnedPattern {
  id: string
  user_id: string
  pattern: string
  response: string
  frequency: number
  confidence: number
  metadata: string // JSON string
  created_at: string
  updated_at: string
}

// API request/response types

export interface CreateEntityRequest {
  entity_type: string
  name: string
  description?: string
  metadata?: Record<string, any>
  user_email?: string  // Optional email to associate with a specific user
}

export interface UpdateEntityRequest {
  name?: string
  description?: string
  metadata?: Record<string, any>
}

export interface CreateMemoryRequest {
  entity_id: string
  memory_type: string
  title: string
  content: string
  metadata?: Record<string, any>
  importance?: number
  user_email?: string  // Optional email to associate with a specific user
}

export interface UpdateMemoryRequest {
  title?: string
  content?: string
  metadata?: Record<string, any>
  importance?: number
}

export interface SearchMemoriesRequest {
  query: string
  entity_id?: string
  limit?: number
  user_email?: string  // Optional email to search memories for a specific user
}

// API response types

export interface EntityResponse {
  id: string
  entity_type: string
  name: string
  description?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MemoryResponse {
  id: string
  entity_id: string
  memory_type: string
  title: string
  content: string
  metadata: Record<string, any>
  importance: number
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Authentication types

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  is_active: boolean
}

export interface AuthContext {
  user: AuthenticatedUser
  isAuthenticated: boolean
}

// Development/Email-based authentication
export interface EmailAuthRequest {
  email: string
  api_key?: string  // Optional API key, if not provided will use/create default
}

// Error types

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface ApiError {
  code: ErrorCode
  message: string
  details?: Record<string, any>
}

// Validation schemas (for use with Zod)

export interface CreateEntitySchema {
  entity_type: string
  name: string
  description?: string
  metadata?: Record<string, any>
}

export interface UpdateEntitySchema {
  name?: string
  description?: string
  metadata?: Record<string, any>
}

export interface CreateMemorySchema {
  entity_id: string
  memory_type: string
  title: string
  content: string
  metadata?: Record<string, any>
  importance?: number
}

export interface UpdateMemorySchema {
  title?: string
  content?: string
  metadata?: Record<string, any>
  importance?: number
}

export interface SearchMemoriesSchema {
  query: string
  entity_id?: string
  limit?: number
}

// Utility types

export type DatabaseRow = Record<string, any>

export type PaginationParams = {
  page?: number
  limit?: number
  offset?: number
}

export type SortParams = {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type FilterParams = {
  entity_type?: string
  memory_type?: string
  importance_min?: number
  importance_max?: number
  created_after?: string
  created_before?: string
}

// Helper type transformers

export type EntityWithParsedMetadata = Omit<Entity, 'metadata'> & {
  metadata: Record<string, any>
}

export type MemoryWithParsedMetadata = Omit<Memory, 'metadata'> & {
  metadata: Record<string, any>
}

// Multi-tenant utility types

export type UserScopedOperation<T> = T & {
  user_id: string
}

export type TenantIsolatedQuery = {
  user_id: string
  [key: string]: any
}