import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Admin username',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'your-secure-password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
