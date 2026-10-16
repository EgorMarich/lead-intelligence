import { IsEmail, IsString, Length, MinLength } from 'class-validator';
export class RegisterDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; @IsString() @Length(2,100) name!: string; @IsString() @Length(2,150) organizationName!: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; }
export class RefreshDto { @IsString() refreshToken!: string; }
export class LogoutDto { @IsString() refreshToken!: string; }
