/**
 * Base Value Object class
 * Value Objects are immutable and compared by their properties
 *
 * @example
 * ```ts
 * interface EnergyProps {
 *   value: number;
 * }
 *
 * class Energy extends ValueObject<EnergyProps> {
 *   get value(): number {
 *     return this.props.value;
 *   }
 *
 *   static create(value: number): Result<Energy, ValidationError> {
 *     if (value < 0) {
 *       return Result.fail(new ValidationError('Energy cannot be negative'));
 *     }
 *     return Result.ok(new Energy({ value }));
 *   }
 * }
 * ```
 */
export abstract class ValueObject<T extends object> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Check equality based on all properties
   */
  equals(other: ValueObject<T> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (other.constructor !== this.constructor) {
      return false;
    }

    return this.propsAreEqual(other.props);
  }

  private propsAreEqual(otherProps: T): boolean {
    const thisKeys = Object.keys(this.props) as (keyof T)[];
    const otherKeys = Object.keys(otherProps) as (keyof T)[];

    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    return thisKeys.every((key) => {
      const thisValue = this.props[key];
      const otherValue = otherProps[key];

      if (thisValue instanceof ValueObject && otherValue instanceof ValueObject) {
        return thisValue.equals(otherValue);
      }

      if (thisValue instanceof Date && otherValue instanceof Date) {
        return thisValue.getTime() === otherValue.getTime();
      }

      return thisValue === otherValue;
    });
  }

  /**
   * Clone with optional property overrides
   */
  protected clone(overrides: Partial<T> = {}): this {
    const Constructor = this.constructor as new (props: T) => this;
    return new Constructor({ ...this.props, ...overrides });
  }
}

/**
 * Identifier Value Object base class
 * For strongly-typed IDs
 */
export abstract class Identifier<T> extends ValueObject<{ value: T }> {
  constructor(value: T) {
    super({ value });
  }

  get value(): T {
    return this.props.value;
  }

  toString(): string {
    return String(this.props.value);
  }
}

/**
 * UUID Identifier
 */
export class UniqueId extends Identifier<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value?: string): UniqueId {
    return new UniqueId(value ?? crypto.randomUUID());
  }

  static fromString(value: string): UniqueId {
    return new UniqueId(value);
  }
}
