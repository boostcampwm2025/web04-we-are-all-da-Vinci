import { Module } from "@nestjs/common";
import { ArchiveController } from "./archive.controller";
import { ArchiveService } from "./archive.service";

@Module({
  controllers: [ArchiveController],
  providers: [ArchiveService],
})
export class ArchiveModule {}
