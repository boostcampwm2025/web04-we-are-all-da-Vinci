jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/core", () => ({
  EntityManager: class {},
  EntityRepository: class {},
  EntityRepositoryType: Symbol("EntityRepositoryType"),
  QueryOrder: { ASC: "asc", DESC: "desc" },
}));
jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
}));
jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => (target: unknown) => target,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
  ManyToOne: () => () => undefined,
  ManyToMany: () => () => undefined,
  OneToMany: () => () => undefined,
}));
