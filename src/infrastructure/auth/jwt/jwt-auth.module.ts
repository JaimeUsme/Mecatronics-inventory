/**
 * JWT Auth Module
 * 
 * Módulo que configura JWT y Passport para autenticación.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPermissiveStrategy } from './jwt-permissive.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
  ],
  providers: [JwtStrategy, JwtPermissiveStrategy],
  exports: [JwtModule, PassportModule],
})
export class JwtAuthModule {}

