import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  it('rejects unknown users without issuing a token', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const jwt = { signAsync: jest.fn() };
    const config = { getOrThrow: jest.fn(), get: jest.fn() };
    const service = new AuthService(prisma as never, jwt as never, config as never);
    await expect(service.login('nobody@example.com', 'bad-password')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
