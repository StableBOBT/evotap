/**
 * Base Entity class for domain entities
 * Entities have identity and are compared by their ID
 *
 * @example
 * ```ts
 * class User extends Entity<UserId> {
 *   constructor(
 *     id: UserId,
 *     public readonly name: string,
 *     public readonly email: string
 *   ) {
 *     super(id);
 *   }
 * }
 * ```
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(id: TId, createdAt?: Date) {
    this._id = id;
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = this._createdAt;
  }

  get id(): TId {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Check equality based on ID
   * Supports both primitive IDs and Value Object IDs
   */
  equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof Entity)) {
      return false;
    }

    // If ID is a Value Object with equals method, use it
    if (
      this._id !== null &&
      typeof this._id === 'object' &&
      'equals' in this._id &&
      typeof this._id.equals === 'function'
    ) {
      return this._id.equals(other._id);
    }

    // Primitive comparison
    return this._id === other._id;
  }
}

/**
 * Aggregate Root is a special Entity that is the entry point to an aggregate
 * It maintains consistency boundaries and emits domain events
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  public getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }
}

/**
 * Domain Event interface
 * Events represent something that happened in the domain
 */
export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Base Domain Event class
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly occurredAt: Date;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown>
  ) {
    this.occurredAt = new Date();
  }
}
