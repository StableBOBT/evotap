import { describe, it, expect } from 'vitest';
import { ValueObject, Identifier, UniqueId } from './ValueObject.js';

// Test implementation of ValueObject
interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  static create(amount: number, currency: string): Money {
    return new Money({ amount, currency });
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money({ amount: this.amount + other.amount, currency: this.currency });
  }
}

describe('ValueObject', () => {
  describe('equality', () => {
    it('should be equal when properties match', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'USD');

      expect(money1.equals(money2)).toBe(true);
    });

    it('should not be equal when properties differ', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(200, 'USD');
      const money3 = Money.create(100, 'EUR');

      expect(money1.equals(money2)).toBe(false);
      expect(money1.equals(money3)).toBe(false);
    });

    it('should not be equal to null or undefined', () => {
      const money = Money.create(100, 'USD');

      expect(money.equals(null)).toBe(false);
      expect(money.equals(undefined)).toBe(false);
    });

    it('should not be equal to different types', () => {
      const money = Money.create(100, 'USD');

      class OtherVO extends ValueObject<MoneyProps> {
        static create(amount: number, currency: string): OtherVO {
          return new OtherVO({ amount, currency });
        }
      }
      const other = OtherVO.create(100, 'USD');

      expect(money.equals(other as unknown as Money)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const money = Money.create(100, 'USD');

      expect(() => {
        (money as { props: MoneyProps }).props.amount = 200;
      }).toThrow();
    });
  });
});

// Test implementation of Identifier
class UserId extends Identifier<number> {
  static create(value: number): UserId {
    return new UserId(value);
  }
}

describe('Identifier', () => {
  describe('value', () => {
    it('should store and return value', () => {
      const id = UserId.create(123);

      expect(id.value).toBe(123);
    });
  });

  describe('equality', () => {
    it('should be equal when values match', () => {
      const id1 = UserId.create(123);
      const id2 = UserId.create(123);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should not be equal when values differ', () => {
      const id1 = UserId.create(123);
      const id2 = UserId.create(456);

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should convert to string', () => {
      const id = UserId.create(123);

      expect(id.toString()).toBe('123');
    });
  });
});

describe('UniqueId', () => {
  describe('create', () => {
    it('should generate unique IDs', () => {
      const id1 = UniqueId.create();
      const id2 = UniqueId.create();

      expect(id1.value).not.toBe(id2.value);
    });

    it('should accept custom value', () => {
      const customId = 'custom-id-123';
      const id = UniqueId.create(customId);

      expect(id.value).toBe(customId);
    });
  });

  describe('fromString', () => {
    it('should create from existing string', () => {
      const value = 'existing-id';
      const id = UniqueId.fromString(value);

      expect(id.value).toBe(value);
    });
  });

  describe('equality', () => {
    it('should be equal for same value', () => {
      const value = 'same-id';
      const id1 = UniqueId.fromString(value);
      const id2 = UniqueId.fromString(value);

      expect(id1.equals(id2)).toBe(true);
    });
  });
});
