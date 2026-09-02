jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/core", () => {
  class UniqueConstraintViolationException extends Error {
    constructor(cause?: Error) {
      super(cause?.message ?? "unique constraint violation");
      this.name = "UniqueConstraintViolationException";
    }
  }
  return {
    EntityManager: class {},
    EntityRepository: class {},
    EntityRepositoryType: Symbol("EntityRepositoryType"),
    UniqueConstraintViolationException,
    RequestContext: {
      create: (_em: unknown, next: () => unknown) => next(),
    },
    QueryOrder: { ASC: "asc", DESC: "desc" },
    LockMode: {
      NONE: 0,
      OPTIMISTIC: 1,
      PESSIMISTIC_READ: 2,
      PESSIMISTIC_WRITE: 3,
      PESSIMISTIC_PARTIAL_WRITE: 4,
      PESSIMISTIC_WRITE_OR_FAIL: 5,
      PESSIMISTIC_PARTIAL_READ: 6,
      PESSIMISTIC_READ_OR_FAIL: 7,
    },
  };
});
jest.mock("@mikro-orm/mysql", () => ({
  EntityManager: class {},
  EntityRepository: class {},
  QueryOrder: { ASC: "asc", DESC: "desc" },
}));

jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => (target: unknown) => target,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
  ManyToOne: () => () => undefined,
  ManyToMany: () => () => undefined,
  OneToMany: () => () => undefined,
  Enum: () => () => undefined,
  Index: () => () => undefined,
  Unique: () => () => undefined,
  Transactional: () => () => undefined,
  // 실제 데코레이터처럼 메서드를 교체해 등록 메타데이터 유실 회귀를 검출한다.
  CreateRequestContext:
    () =>
    (
      _target: unknown,
      _propertyKey: string | symbol,
      descriptor: PropertyDescriptor,
    ) => {
      const originalMethod = descriptor.value as (
        ...args: unknown[]
      ) => unknown;
      descriptor.value = function (
        this: unknown,
        ...args: unknown[]
      ): Promise<unknown> {
        return Promise.resolve(originalMethod.apply(this, args));
      };
      return descriptor;
    },
}));
