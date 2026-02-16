/* eslint-disable @typescript-eslint/unbound-method  */
import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketExceptionFilter } from './websocket-exception.filter';
import { PinoLogger } from 'nestjs-pino';
import { WebsocketException } from './websocket-exception';
import { Socket } from 'socket.io';
import { ArgumentsHost, WsArgumentsHost } from '@nestjs/common/interfaces';
import { InternalError } from './internal-error';
import { ErrorCode } from '../constants/error-code';

describe('WebsocketExceptionFilter', () => {
  let filter: WebsocketExceptionFilter;
  let logger: PinoLogger;

  const mockSocket = {
    emit: jest.fn(),
    id: 'testId',
  } as unknown as Socket;

  const mockWsArgumentsHost = {
    getClient: jest.fn().mockReturnValue(mockSocket),
  } as unknown as WsArgumentsHost;

  const mockArgumentsHost = {
    switchToWs: jest.fn().mockReturnValue(mockWsArgumentsHost),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketExceptionFilter,
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    logger = module.get<PinoLogger>(PinoLogger);
    filter = module.get<WebsocketExceptionFilter>(WebsocketExceptionFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('WebsocketException이 발생하면 에러를 로깅하고 클라이언트에게 에러를 전송한다.', () => {
    // given
    const exception = new WebsocketException('Test Error');

    // when
    filter.catch(exception, mockArgumentsHost);

    // then
    expect(logger.error).toHaveBeenCalledWith(
      { error: exception, clientId: 'testId' },
      'Websocket Exception',
    );
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: exception.message,
    });
  });

  it('InternalError가 발생하면 에러를 로깅하고 클라이언트에게 에러를 전송한다.', () => {
    // given
    const exception = new InternalError('Test Error');

    // when
    filter.catch(exception, mockArgumentsHost);

    // then
    expect(logger.error).toHaveBeenCalledWith(
      { error: exception, clientId: 'testId' },
      'Websocket Exception',
    );
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: exception.message,
    });
  });

  it('WebsocketException이 아닌 다른 에러가 발생하면 WebsocketException으로 다시 처리한다.', () => {
    // given
    const exception = new Error('Test Error');

    // when
    filter.catch(exception, mockArgumentsHost);

    // then
    expect(logger.error).toHaveBeenCalledWith(
      {
        error: new WebsocketException(ErrorCode.INTERNAL_ERROR),
        clientId: 'testId',
      },
      'Websocket Exception',
    );
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: ErrorCode.INTERNAL_ERROR,
    });
  });
});
