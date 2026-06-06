import { Logger, Module, OnModuleInit } from "@nestjs/common";
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
} from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { TRACE_TARGET_METADATA } from "./trace.decorator";
import { withSpan } from "./with-span";

type Method = (this: unknown, ...args: unknown[]) => unknown;
@Module({
  imports: [DiscoveryModule],
})
export class TraceAopModule implements OnModuleInit {
  private readonly logger = new Logger(TraceAopModule.name);
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    if (process.env.OTEL_ENABLED !== "true") {
      return;
    }

    this.getProviders().forEach((provider: InstanceWrapper) => {
      const instance = provider.instance as Record<string, unknown> | undefined;
      if (!instance) {
        return;
      }

      const prototype = Object.getPrototypeOf(instance) as object;
      const isClassTraceTarget = this.isClassTraceTarget(provider);

      this.metadataScanner
        .getAllMethodNames(prototype)
        .forEach((methodName) => {
          const originalMethod = instance[methodName];

          if (!this.isMethod(originalMethod)) {
            return;
          }
          const isMethodTraceTarget = this.isMethodTraceTarget(originalMethod);

          if (!isClassTraceTarget && !isMethodTraceTarget) {
            return;
          }

          const spanName = `${provider.name}.${methodName}`;
          this.logger.log(spanName);

          instance[methodName] = this.wrapAsyncMethod(originalMethod, spanName);
        });
    });
  }

  private isMethod(value: unknown): value is Method {
    return typeof value === "function";
  }

  private getProviders(): InstanceWrapper[] {
    return this.discoveryService
      .getProviders()
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter(({ instance }) => instance && Object.getPrototypeOf(instance));
  }

  private isClassTraceTarget(wrapper: InstanceWrapper): boolean {
    if (!wrapper.metatype) {
      return false;
    }

    return Reflect.hasMetadata(TRACE_TARGET_METADATA, wrapper.metatype);
  }

  private isMethodTraceTarget(method: Method): boolean {
    return Reflect.hasMetadata(TRACE_TARGET_METADATA, method);
  }

  private wrapAsyncMethod(originMethod: Method, spanName: string) {
    const wrappedMethod: Method = function (this: unknown, ...args: unknown[]) {
      return withSpan(spanName, async () => {
        return await Promise.resolve(originMethod.apply(this, args));
      });
    };

    // 기존에 존재한 metadata 복사
    this.copyMetadata(originMethod, wrappedMethod);
    this.copyFunctionName(originMethod, wrappedMethod);
    return wrappedMethod;
  }

  private copyMetadata(source: Method, target: Method) {
    Reflect.getMetadataKeys(source).forEach((key: unknown) => {
      const metadata: unknown = Reflect.getMetadata(key, source);
      Reflect.defineMetadata(key, metadata, target);
    });
  }

  private copyFunctionName(source: Method, target: Method) {
    Object.defineProperty(target, "name", {
      value: source.name,
      configurable: true,
    });
  }
}
