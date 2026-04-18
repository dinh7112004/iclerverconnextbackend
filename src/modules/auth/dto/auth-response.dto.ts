import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/role.enum';

class UserData {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  avatar: string;

  @ApiProperty()
  mfaEnabled: boolean;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;

  @ApiProperty({ type: UserData })
  user: UserData;
}
