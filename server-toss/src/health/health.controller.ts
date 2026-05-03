import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "헬스체크" })
  @ApiResponse({ status: 200, description: "서버 정상" })
  check() {
    return { status: "ok" };
  }
}
