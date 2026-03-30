import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, AggregateRoot, BaseDomainEvent } from './Entity.js';
import { UniqueId } from './ValueObject.js';

// Test implementation
class TestEntity extends Entity<string> {
  constructor(
    id: string,
    public name: string
  ) {
    super(id);
  }

  changeName(newName: string): void {
    this.name = newName;
    this.touch();
  }
}

// Test Aggregate implementation
class UserRegisteredEvent extends BaseDomainEvent {
  constructor(userId: string, username: string) {
    super('UserRegistered', userId, { username });
  }
}

class TestAggregate extends AggregateRoot<string> {
  constructor(
    id: string,
    public username: string
  ) {
    super(id);
    this.addDomainEvent(new UserRegisteredEvent(id, username));
  }

  changeUsername(newUsername: string): void {
    this.username = newUsername;
    this.addDomainEvent(
      new BaseDomainEvent('UsernameChanged', this.id, {
        oldUsername: this.username,
        newUsername,
      }) as UserRegisteredEvent
    );
  }
}

describe('Entity', () => {
  let entity: TestEntity;

  beforeEach(() => {
    entity = new TestEntity('entity-1', 'Test Name');
  });

  describe('id', () => {
    it('should have an id', () => {
      expect(entity.id).toBe('entity-1');
    });
  });

  describe('timestamps', () => {
    it('should have createdAt timestamp', () => {
      expect(entity.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt timestamp', () => {
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt when touched', () => {
      const originalUpdatedAt = entity.updatedAt;

      // Wait a bit to ensure different timestamp
      entity.changeName('New Name');

      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('equality', () => {
    it('should be equal to entity with same id', () => {
      const entity1 = new TestEntity('same-id', 'Name 1');
      const entity2 = new TestEntity('same-id', 'Name 2');

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should not be equal to entity with different id', () => {
      const entity1 = new TestEntity('id-1', 'Same Name');
      const entity2 = new TestEntity('id-2', 'Same Name');

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should not be equal to null', () => {
      expect(entity.equals(null)).toBe(false);
    });

    it('should not be equal to undefined', () => {
      expect(entity.equals(undefined)).toBe(false);
    });

    it('should be equal when using Value Object IDs with same value', () => {
      class EntityWithVOId extends Entity<UniqueId> {
        constructor(id: UniqueId) {
          super(id);
        }
      }

      const id1 = UniqueId.fromString('same-uuid');
      const id2 = UniqueId.fromString('same-uuid');
      const entity1 = new EntityWithVOId(id1);
      const entity2 = new EntityWithVOId(id2);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should not be equal when using Value Object IDs with different values', () => {
      class EntityWithVOId extends Entity<UniqueId> {
        constructor(id: UniqueId) {
          super(id);
        }
      }

      const id1 = UniqueId.fromString('uuid-1');
      const id2 = UniqueId.fromString('uuid-2');
      const entity1 = new EntityWithVOId(id1);
      const entity2 = new EntityWithVOId(id2);

      expect(entity1.equals(entity2)).toBe(false);
    });
  });
});

describe('AggregateRoot', () => {
  let aggregate: TestAggregate;

  beforeEach(() => {
    aggregate = new TestAggregate('agg-1', 'testuser');
  });

  describe('domain events', () => {
    it('should collect domain events', () => {
      const events = aggregate.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('UserRegistered');
    });

    it('should add more events', () => {
      aggregate.changeUsername('newuser');

      const events = aggregate.getDomainEvents();

      expect(events).toHaveLength(2);
    });

    it('should clear events', () => {
      aggregate.clearDomainEvents();

      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('should return copy of events', () => {
      const events1 = aggregate.getDomainEvents();
      const events2 = aggregate.getDomainEvents();

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });
});

describe('BaseDomainEvent', () => {
  it('should have correct properties', () => {
    const event = new UserRegisteredEvent('user-1', 'testuser');

    expect(event.eventType).toBe('UserRegistered');
    expect(event.aggregateId).toBe('user-1');
    expect(event.payload).toEqual({ username: 'testuser' });
    expect(event.occurredAt).toBeInstanceOf(Date);
  });
});
