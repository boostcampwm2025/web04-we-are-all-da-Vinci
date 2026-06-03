jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/core", () => ({
  EntityManager: class {},
  EntityRepository: class {},
  EntityRepositoryType: Symbol("EntityRepositoryType"),
  // @Cron/@OnEvent의 RequestContext.create 래핑을 단위 테스트에서 콜백 즉시 실행으로 대체.
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
}));
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
  Transactional: () => () => undefined,
}));
