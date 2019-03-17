import { Module, Injectable, Controller, Get } from '@nestjs/common';

@Controller()
export class ApiController {
  @Get('/info')
  async getInfo() {
    return 'hello';
  }
}

@Injectable()
export class ApiService {}

@Module({
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
