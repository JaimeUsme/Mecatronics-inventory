/**
 * JWT Auth Module
 * 
 * Módulo que configura JWT y Passport para autenticación.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPermissiveStrategy } from './jwt-permissive.strategy';
import { InternalUser } from '../../persistence/entities/internal-user.entity';
import { WisproSessionRefreshModule } from '../../external/wispro/wispro-session-refresh.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InternalUser]),
    WisproSessionRefreshModule,
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

