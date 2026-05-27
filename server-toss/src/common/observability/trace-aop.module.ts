import { Module, OnModuleInit } from "@nestjs/common";
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
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    this.getProviders().forEach((provider: InstanceWrapper) => {
      const instance = provider.instance as Record<string, unknown> | undefined;
      if (!instance) {
        return;
      }

      const prototype = Object.getPrototypeOf(instance) as object;
      this.metadataScanner
        .getAllMethodNames(prototype)
        .forEach((methodName) => {
          const originalMethod = instance[methodName];

          if (!this.isMethod(originalMethod)) {
            return;
          }

          const spanName = `${provider.name}.${methodName}`;

          instance[methodName] = this.wrapAsyncMethod(originalMethod, spanName);
        });
    });
  }

  private isMethod(value: unknown): value is Method {
    return typeof value !== "function";
  }

  private getProviders(): InstanceWrapper[] {
    return this.discoveryService
      .getProviders()
      .filter((wrapper) => this.isTraceTarget(wrapper));
  }

  private isTraceTarget(wrapper: InstanceWrapper) {
    if (!wrapper.metatype) {
      return false;
    }

    return Reflect.hasMetadata(TRACE_TARGET_METADATA, wrapper.metatype);
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
