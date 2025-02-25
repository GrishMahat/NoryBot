/**
 * @file Utility types
 * @description Generic utility types for TypeScript type safety and manipulation
 */

/**
 * Makes all properties in T required and non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Makes all properties in T optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Makes specified properties in T required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specified properties in T optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Creates a type with only the specified properties from T
 */
export type PickProps<T, K extends keyof T> = Pick<T, K>;

/**
 * Creates a type excluding the specified properties from T
 */
export type OmitProps<T, K extends keyof T> = Omit<T, K>;

/**
 * Makes all properties in T readonly
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Makes all properties in T mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Creates a type that requires at least one of the properties in T
 */
export type RequireAtLeastOne<T> = {
  [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Creates a type that allows only one of the properties in T
 */
export type RequireOnlyOne<T> = {
  [K in keyof T]: Required<Pick<T, K>> & Omit<Partial<T>, K>;
}[keyof T];

/**
 * Creates a type with all properties in T nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Creates a deep partial type (all nested properties are optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Creates a type that recursively makes all properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Type guard helper
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Async function type helper
 */
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * Function with retry options
 */
export interface RetryableFunction<T = void> {
  /** The function to retry */
  fn: AsyncFunction<T>;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff?: boolean;
  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Property to sort by */
  sortBy?: string;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Maximum number of items in cache */
  maxSize?: number;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Whether to update TTL on access */
  updateAgeOnGet?: boolean;
  /** Whether to update TTL on set */
  updateAgeOnSet?: boolean;
  /** Callback when items are evicted */
  onEviction?: (key: string, value: unknown) => void;
}
