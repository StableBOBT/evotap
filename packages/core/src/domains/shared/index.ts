// Result pattern
export { Result, isOk, isFail, type ResultOk, type ResultFail } from './Result.js';

// Entity & Aggregate
export { Entity, AggregateRoot, BaseDomainEvent, type DomainEvent } from './Entity.js';

// Value Objects
export { ValueObject, Identifier, UniqueId } from './ValueObject.js';

// Errors
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  BusinessRuleError,
  RateLimitError,
  NoEnergyError,
  GameNotFoundError,
  UserNotFoundError,
  InvalidReferralError,
  DuplicateUserError,
} from './Errors.js';
