import { Controller, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ArchiveService } from "./archive.service";

@ApiTags("Archive")
@UseGuards(JwtAuthGuard)
@Controller("archive")
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}
}
