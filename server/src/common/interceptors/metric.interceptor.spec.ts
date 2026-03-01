/* eslint-disable @typescript-eslint/unbound-method  */
/* eslint-disable @typescript-eslint/no-unsafe-argument  */

import { Test, TestingModule } from '@nestjs/testing';
import { MetricInterceptor } from './metric.interceptor';
import { MetricService } from 'src/metric/metric.service';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

describe('MetricInterceptor', () => {
  let metricInterceptor: MetricInterceptor;
  let metricService: jest.Mocked<MetricService>;

  const mockEnd = jest.fn();
  const mockMetricService = {
    startTimer: jest.fn(),
    incEvent: jest.fn(),
  };

  const mockWsArgumentsHost = {
    getPattern: jest.fn(),
  };

  const mockContext = {
    switchToWs: jest.fn(),
  } as unknown as jest.Mocked<ExecutionContext>;

  const mockNext = {
    handle: jest.fn(),
  } as unknown as jest.Mocked<CallHandler>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricInterceptor,
        { provide: MetricService, useValue: mockMetricService },
      ],
    }).compile();

    metricInterceptor = module.get<MetricInterceptor>(MetricInterceptor);
    metricService = module.get(MetricService);

    mockContext.switchToWs.mockReturnValue(
      mockWsArgumentsHost as unknown as any,
    );
    mockMetricService.startTimer.mockReturnValue(mockEnd);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(metricInterceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('성공하면 ok를 증가시킨다.', async () => {
      // given
      const eventName = 'testEvent';
      mockWsArgumentsHost.getPattern.mockReturnValue(eventName);
      mockNext.handle.mockReturnValue(of('success'));

      // when
      await lastValueFrom(metricInterceptor.intercept(mockContext, mockNext));

      // then
      expect(metricService.startTimer).toHaveBeenCalled();
      expect(metricService.incEvent).toHaveBeenCalledWith(eventName, 'ok');
      expect(mockEnd).toHaveBeenCalledWith({ eventName });
    });

    it('에러가 발생하면 error를 증가시킨다.', async () => {
      // given
      const eventName = 'testEvent';
      mockWsArgumentsHost.getPattern.mockReturnValue(eventName);
      mockNext.handle.mockReturnValue(throwError(() => new Error('error')));

      // when
      try {
        await lastValueFrom(metricInterceptor.intercept(mockContext, mockNext));
      } catch {
        // expected error
      }

      // then
      expect(metricService.startTimer).toHaveBeenCalled();
      expect(metricService.incEvent).toHaveBeenCalledWith(eventName, 'error');
      expect(mockEnd).toHaveBeenCalledWith({ eventName });
    });

    it('완료되면 타이머를 종료한다.', async () => {
      // given
      const eventName = 'testEvent';
      mockWsArgumentsHost.getPattern.mockReturnValue(eventName);
      mockNext.handle.mockReturnValue(of('success'));

      // when
      await lastValueFrom(metricInterceptor.intercept(mockContext, mockNext));

      // then
      expect(mockEnd).toHaveBeenCalledWith({ eventName });
    });
  });
});
