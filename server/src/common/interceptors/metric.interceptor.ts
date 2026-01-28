import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricService } from 'src/metric/metric.service';

@Injectable()
export class MetricInterceptor implements NestInterceptor {
  constructor(private readonly metricService: MetricService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ws = context.switchToWs();

    const eventName = ws.getPattern();
    const end = this.metricService.startTimer();

    return next.handle().pipe(
      tap({
        complete: () => this.metricService.incEvent(eventName, 'ok'),
        error: () => this.metricService.incEvent(eventName, 'error'),
        finalize: () => end({ eventName }),
      }),
    );
  }
}
