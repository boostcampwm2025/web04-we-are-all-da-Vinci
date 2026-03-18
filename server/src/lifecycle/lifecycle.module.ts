import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';

@Module({ providers: [LifecycleService], exports: [LifecycleService] })
export class LifecycleModule {}
